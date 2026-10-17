import connectDB from '@/lib/db';
import PerformanceIndicator from '@/lib/models/PerformanceIndicator';
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
    const categoryId = sp.get('category_id');
    const sortField = SORT_MAP[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { measurement_unit: { $regex: search, $options: 'i' } },
        { target_value: { $regex: search, $options: 'i' } },
      ];
    }
    if (categoryId) filter.category_id = categoryId;

    const baseFilter = { ...filter };
    if (status && status !== 'all') filter.status = status;

    const [indicators, total, activeCount, inactiveCount] = await Promise.all([
      PerformanceIndicator.find(filter)
        .populate('category_id', 'name')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit),
      PerformanceIndicator.countDocuments(filter),
      PerformanceIndicator.countDocuments({ ...baseFilter, status: 'active' }),
      PerformanceIndicator.countDocuments({ ...baseFilter, status: 'inactive' }),
    ]);

    const statusCounts = { all: activeCount + inactiveCount, active: activeCount, inactive: inactiveCount };

    return Response.json(
      {
        indicators,
        statusCounts,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching indicators');
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', required: true, trim: true, messages: { required: 'Indicator name is required' } },
      { field: 'category_id', required: true, messages: { required: 'Category is required' } },
      { field: 'description', optional: true, trim: true },
      { field: 'measurement_unit', optional: true, trim: true },
      { field: 'target_value', optional: true, trim: true },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });
    await connectDB();
    const indicator = await PerformanceIndicator.create({
      name: data.name,
      category_id: data.category_id,
      description: data.description ?? null,
      measurement_unit: data.measurement_unit ?? null,
      target_value: data.target_value ?? null,
      status: data.status ?? 'active',
    });
    const populated = await indicator.populate('category_id', 'name');
    return Response.json({ message: 'Indicator created successfully', indicator: populated }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating indicator');
  }
}
