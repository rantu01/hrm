import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Role from '@/lib/models/Role';
import Employee from '@/lib/models/Employee';
import { requireAuth, requirePermission, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

const SORT_MAP = { name: 'name', created_at: 'createdAt', createdAt: 'createdAt' };

async function authorize(request, permission) {
  try {
    return await requirePermission(request, permission);
  } catch (err) {
    if (err && err.statusCode === 403) {
      await connectDB();
      const count = await Role.countDocuments();
      if (count === 0) return requireAuth(request);
    }
    throw err;
  }
}

function sanitize(data) {
  const out = { ...(data || {}) };
  for (const key of Object.keys(out)) {
    if (out[key] === '' || out[key] === undefined) delete out[key];
  }
  return out;
}

// Passwords are never serialized: select excludes it everywhere here.
const PUBLIC_SELECT = 'name email type role avatar status createdAt updatedAt';

export async function GET(request) {
  try {
    await authorize(request, 'view-users');
    await connectDB();

    const sp = request.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get('page'), 10) || 1, 1);
    const limit = Math.max(parseInt(sp.get('per_page'), 10) || parseInt(sp.get('limit'), 10) || 10, 1);
    const skip = (page - 1) * limit;

    const search = (sp.get('search') || '').trim();
    const baseFilter = {};
    if (search) {
      const rx = { $regex: search, $options: 'i' };
      baseFilter.$or = [{ name: rx }, { email: rx }];
    }
    const role = sp.get('role');
    if (role && role !== 'all' && role !== '') baseFilter.role = role;

    const status = sp.get('status');
    const filter = { ...baseFilter };
    if (status && status !== 'all' && status !== '') filter.status = status;

    const sortField = SORT_MAP[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const [users, total, all, active, inactive, suspended] = await Promise.all([
      User.find(filter).select(PUBLIC_SELECT).sort({ [sortField]: sortDirection }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
      User.countDocuments(baseFilter),
      User.countDocuments({ ...baseFilter, status: 'active' }),
      User.countDocuments({ ...baseFilter, status: 'inactive' }),
      User.countDocuments({ ...baseFilter, status: 'suspended' }),
    ]);

    return Response.json(
      {
        users,
        statusCounts: { all, active, inactive, suspended },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching users');
  }
}

export async function POST(request) {
  try {
    await authorize(request, 'create-users');
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', required: true, trim: true, messages: { required: 'Name is required' } },
      { field: 'email', isEmail: true, normalizeEmail: true, messages: { isEmail: 'Please provide a valid email' } },
      { field: 'avatar', optional: true, trim: true },
      { field: 'password', minLength: 6, messages: { minLength: 'Password must be at least 6 characters' } },
      { field: 'role', required: true, trim: true, messages: { required: 'Role is required' } },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    const clean = sanitize(data);
    if (!clean.password) {
      return Response.json({ message: 'Password is required' }, { status: 400 });
    }
    if (body.password_confirmation !== clean.password) {
      return Response.json({ message: 'Passwords do not match' }, { status: 400 });
    }

    await connectDB();
    const existing = await User.findOne({ email: clean.email });
    if (existing) {
      return Response.json({ message: 'A user with this email already exists' }, { status: 400 });
    }

    const roleDoc = await Role.findOne({ name: clean.role });
    if (!roleDoc) return Response.json({ message: 'Selected role does not exist' }, { status: 400 });

    const user = await User.create({
      name: clean.name,
      email: clean.email,
      password: clean.password,
      avatar: clean.avatar || null,
      role: roleDoc.name,
      // Account type mirrors the assigned role, like the reference module.
      type: roleDoc.name === 'Super Admin' ? 'superadmin' : 'employee',
      status: 'active',
    });

    return Response.json(
      { message: 'User created successfully', user: user.toPublicProfile() },
      { status: 201 }
    );
  } catch (error) {
    if (error && error.code === 11000) {
      return Response.json({ message: 'A user with this email already exists' }, { status: 400 });
    }
    return handleApiError(error, 'Server error creating user');
  }
}
