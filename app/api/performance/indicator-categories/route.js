import connectDB from '@/lib/db';
import PerformanceIndicatorCategory from '@/lib/models/PerformanceIndicatorCategory';
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

    const [indicatorCategories, total, activeCount, inactiveCount] = await Promise.all([
      PerformanceIndicatorCategory.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit),
      PerformanceIndicatorCategory.countDocuments(filter),
      PerformanceIndicatorCategory.countDocuments({ ...baseFilter, status: 'active' }),
      PerformanceIndicatorCategory.countDocuments({ ...baseFilter, status: 'inactive' }),
    ]);

    const statusCounts = { all: activeCount + inactiveCount, active: activeCount, inactive: inactiveCount };

    return Response.json(
      {
        indicatorCategories,
        statusCounts,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching indicator categories');
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', required: true, trim: true, messages: { required: 'Category name is required' } },
      { field: 'description', optional: true, trim: true },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });
    await connectDB();
    const indicatorCategory = await PerformanceIndicatorCategory.create({
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? 'active',
    });
    return Response.json({ message: 'Indicator category created successfully', indicatorCategory }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating indicator category');
  }
}
