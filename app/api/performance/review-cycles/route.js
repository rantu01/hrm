import connectDB from '@/lib/db';
import ReviewCycle from '@/lib/models/ReviewCycle';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

const SORT_MAP = { name: 'name', frequency: 'frequency', created_at: 'createdAt' };

export async function GET(request) {
  try {
    await requireAuth(request);
    await connectDB();
    const sp = request.nextUrl.searchParams;
    const page = parseInt(sp.get('page'), 10) || 1;
    const limit = parseInt(sp.get('per_page'), 10) || parseInt(sp.get('limit'), 10) || 10;
    const skip = (page - 1) * limit;
    const search = (sp.get('search') || '').trim();
    const status = sp.get('status');
    const frequency = sp.get('frequency');
    const sortField = SORT_MAP[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (frequency) filter.frequency = frequency;

    const baseFilter = { ...filter };
    if (status && status !== 'all') filter.status = status;

    const [reviewCycles, total, activeCount, inactiveCount] = await Promise.all([
      ReviewCycle.find(filter).sort({ [sortField]: sortDirection }).skip(skip).limit(limit),
      ReviewCycle.countDocuments(filter),
      ReviewCycle.countDocuments({ ...baseFilter, status: 'active' }),
      ReviewCycle.countDocuments({ ...baseFilter, status: 'inactive' }),
    ]);

    const statusCounts = { all: activeCount + inactiveCount, active: activeCount, inactive: inactiveCount };

    return Response.json(
      {
        reviewCycles,
        statusCounts,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching review cycles');
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', required: true, trim: true, messages: { required: 'Review cycle name is required' } },
      {
        field: 'frequency',
        required: true,
        isIn: ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'One-time'],
        messages: { required: 'Frequency is required' },
      },
      { field: 'description', optional: true, trim: true },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });
    await connectDB();
    const reviewCycle = await ReviewCycle.create({
      name: data.name,
      frequency: data.frequency,
      description: data.description ?? null,
      status: data.status ?? 'active',
    });
    return Response.json({ message: 'Review cycle created successfully', reviewCycle }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating review cycle');
  }
}
