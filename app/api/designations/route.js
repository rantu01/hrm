import connectDB from '@/lib/db';
import Designation from '@/lib/models/Designation';
import Department from '@/lib/models/Department';
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

function designationPopulate(query) {
  return query.populate({
    path: 'department_id',
    select: 'name branch_id',
    populate: { path: 'branch_id', select: 'name' },
  });
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
    // `department` query param maps to department_id
    const department = sp.get('department') || sp.get('department_id');
    if (department && department !== 'all' && department !== '') baseFilter.department_id = department;

    const status = sp.get('status');
    const filter = { ...baseFilter };
    if (status && status !== 'all' && status !== '') filter.status = status;

    const sortField = SORT_MAP[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const [designations, total, all, active, inactive] = await Promise.all([
      designationPopulate(Designation.find(filter))
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit),
      Designation.countDocuments(filter),
      Designation.countDocuments(baseFilter),
      Designation.countDocuments({ ...baseFilter, status: 'active' }),
      Designation.countDocuments({ ...baseFilter, status: 'inactive' }),
    ]);
    return Response.json(
      {
        designations,
        statusCounts: { all, active, inactive },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching designations');
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', required: true, trim: true, messages: { required: 'Designation name is required' } },
      { field: 'description', optional: true, trim: true },
      { field: 'department_id', required: true, messages: { required: 'Department is required' } },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });
    await connectDB();
    const payload = sanitize(data);
    const department = await Department.findById(payload.department_id).select('_id');
    if (!department) {
      return Response.json({ message: 'Invalid department selected' }, { status: 400 });
    }
    const designation = await Designation.create(payload);
    const populated = await designationPopulate(Designation.findById(designation._id));
    return Response.json({ message: 'Designation created successfully', designation: populated }, { status: 201 });
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Invalid department selected' }, { status: 400 });
    }
    if (error.code === 11000) {
      return Response.json({ message: 'Designation already exists' }, { status: 400 });
    }
    return handleApiError(error, 'Server error creating designation');
  }
}
