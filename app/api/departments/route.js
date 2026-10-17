import connectDB from '@/lib/db';
import Department from '@/lib/models/Department';
import Branch from '@/lib/models/Branch';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

const SORT_MAP = { name: 'name', created_at: 'createdAt', createdAt: 'createdAt' };

// Drop empty-string values so optional refs fall back to schema defaults.
function sanitize(data) {
  const out = { ...(data || {}) };
  for (const key of Object.keys(out)) {
    if (out[key] === '' || out[key] === undefined) delete out[key];
  }
  return out;
}

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
    const branchId = sp.get('branch_id');
    if (branchId && branchId !== 'all' && branchId !== '') baseFilter.branch_id = branchId;

    const status = sp.get('status');
    const filter = { ...baseFilter };
    if (status && status !== 'all' && status !== '') filter.status = status;

    const sortField = SORT_MAP[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const [departments, total, all, active, inactive] = await Promise.all([
      Department.find(filter)
        .populate('branch_id', 'name')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit),
      Department.countDocuments(filter),
      Department.countDocuments(baseFilter),
      Department.countDocuments({ ...baseFilter, status: 'active' }),
      Department.countDocuments({ ...baseFilter, status: 'inactive' }),
    ]);
    return Response.json(
      {
        departments,
        statusCounts: { all, active, inactive },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching departments');
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', required: true, trim: true, messages: { required: 'Department name is required' } },
      { field: 'branch_id', required: true, messages: { required: 'Branch is required' } },
      { field: 'description', optional: true, trim: true },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });
    await connectDB();
    const payload = sanitize(data);
    const branch = await Branch.findById(payload.branch_id).select('_id');
    if (!branch) {
      return Response.json({ message: 'Invalid branch selected' }, { status: 400 });
    }
    const department = await Department.create(payload);
    const populated = await Department.findById(department._id).populate('branch_id', 'name');
    return Response.json({ message: 'Department created successfully', department: populated }, { status: 201 });
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Invalid branch selected' }, { status: 400 });
    }
    if (error.code === 11000) {
      return Response.json({ message: 'Department already exists' }, { status: 400 });
    }
    return handleApiError(error, 'Server error creating department');
  }
}
