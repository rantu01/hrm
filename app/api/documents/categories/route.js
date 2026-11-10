import connectDB from '@/lib/db';
import DocumentCategory from '@/lib/models/DocumentCategory';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

const SORT_MAP = { name: 'name', created_at: 'createdAt', createdAt: 'createdAt', sort_order: 'sort_order' };

export async function GET(request) {
  try {
    await requireAuth(request);
    await connectDB();
    const sp = request.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get('page'), 10) || 1, 1);
    const limit = Math.max(parseInt(sp.get('per_page'), 10) || parseInt(sp.get('limit'), 10) || 10, 1);
    const skip = (page - 1) * limit;

    const search = (sp.get('search') || '').trim();
    const baseFilter = {};
    if (search) {
      const rx = { $regex: search, $options: 'i' };
      baseFilter.$or = [{ name: rx }, { description: rx }];
    }

    const status = sp.get('status');
    const filter = { ...baseFilter };
    if (status && status !== 'all' && status !== '') filter.status = status;

    const isMandatory = sp.get('is_mandatory');
    if (isMandatory && isMandatory !== 'all') {
      filter.is_mandatory = isMandatory === 'true';
    }

    const sortField = SORT_MAP[sp.get('sort_field')] || 'sort_order';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortDirection };
    if (sortField !== 'sort_order') sortObj.sort_order = 1;

    const [items, total, all, active, inactive] = await Promise.all([
      DocumentCategory.find(filter).sort(sortObj).skip(skip).limit(limit),
      DocumentCategory.countDocuments(filter),
      DocumentCategory.countDocuments(baseFilter),
      DocumentCategory.countDocuments({ ...baseFilter, status: 'active' }),
      DocumentCategory.countDocuments({ ...baseFilter, status: 'inactive' }),
    ]);

    return Response.json(
      {
        documentCategories: items,
        statusCounts: { all, active, inactive },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching document categories');
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', required: true, trim: true, messages: { required: 'Name is required' } },
      { field: 'description', optional: true, trim: true },
      { field: 'color', optional: true, trim: true },
      { field: 'icon', optional: true, trim: true },
      { field: 'sort_order', optional: true },
      { field: 'is_mandatory', optional: true },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    await connectDB();
    const payload = { ...data };
    if (payload.sort_order !== undefined && payload.sort_order !== '') payload.sort_order = Number(payload.sort_order);
    if (payload.is_mandatory !== undefined) payload.is_mandatory = payload.is_mandatory === true || payload.is_mandatory === 'true';
    if (!payload.color) payload.color = '#3b82f6';
    if (!payload.icon) payload.icon = 'FileText';
    if (!payload.status) payload.status = 'active';

    const item = await DocumentCategory.create(payload);
    return Response.json({ message: 'Document category created successfully', documentCategory: item }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating document category');
  }
}