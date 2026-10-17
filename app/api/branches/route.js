import connectDB from '@/lib/db';
import Branch from '@/lib/models/Branch';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

const SORT_MAP = { name: 'name', created_at: 'createdAt', createdAt: 'createdAt' };

// Drop empty-string values so optional fields fall back to schema defaults.
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
      baseFilter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }

    const status = sp.get('status');
    const filter = { ...baseFilter };
    if (status && status !== 'all' && status !== '') filter.status = status;

    const sortField = SORT_MAP[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const [branches, total, all, active, inactive] = await Promise.all([
      Branch.find(filter).sort({ [sortField]: sortDirection }).skip(skip).limit(limit),
      Branch.countDocuments(filter),
      Branch.countDocuments(baseFilter),
      Branch.countDocuments({ ...baseFilter, status: 'active' }),
      Branch.countDocuments({ ...baseFilter, status: 'inactive' }),
    ]);
    return Response.json(
      {
        branches,
        statusCounts: { all, active, inactive },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching branches');
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', required: true, trim: true, messages: { required: 'Branch name is required' } },
      { field: 'address', optional: true, trim: true },
      { field: 'city', optional: true, trim: true },
      { field: 'state', optional: true, trim: true },
      { field: 'country', optional: true, trim: true },
      { field: 'zip_code', optional: true, trim: true },
      { field: 'phone', optional: true, trim: true },
      { field: 'email', optional: true, trim: true, isEmail: true, messages: { isEmail: 'Please provide a valid email' } },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });
    await connectDB();
    const branch = await Branch.create(sanitize(data));
    return Response.json({ message: 'Branch created successfully', branch }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating branch');
  }
}
