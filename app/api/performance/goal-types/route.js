import connectDB from '@/lib/db';
import GoalType from '@/lib/models/GoalType';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

const SORT_MAP = { name: 'name', created_at: 'createdAt' };

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
    const sortField = SORT_MAP[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const baseFilter = { ...filter };
    if (status && status !== 'all') filter.status = status;

    const [goalTypes, total, activeCount, inactiveCount] = await Promise.all([
      GoalType.find(filter).sort({ [sortField]: sortDirection }).skip(skip).limit(limit),
      GoalType.countDocuments(filter),
      GoalType.countDocuments({ ...baseFilter, status: 'active' }),
      GoalType.countDocuments({ ...baseFilter, status: 'inactive' }),
    ]);

    const statusCounts = { all: activeCount + inactiveCount, active: activeCount, inactive: inactiveCount };

    return Response.json(
      {
        goalTypes,
        statusCounts,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching goal types');
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', required: true, trim: true, messages: { required: 'Goal type name is required' } },
      { field: 'description', optional: true, trim: true },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });
    await connectDB();
    const goalType = await GoalType.create(data);
    return Response.json({ message: 'Goal type created successfully', goalType }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating goal type');
  }
}
