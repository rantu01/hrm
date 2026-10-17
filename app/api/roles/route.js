import connectDB from '@/lib/db';
import Role from '@/lib/models/Role';
import User from '@/lib/models/User';
import { requireAuth, requirePermission, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import { isValidPermission, defaultSystemRoles } from '@/lib/permissions';

const SORT_MAP = { name: 'name', created_at: 'createdAt', createdAt: 'createdAt' };

// Staff management requires the matching permission. Superadmins always pass.
// When no roles exist yet (fresh setup), any authenticated user may proceed
// so the first administrator can be configured.
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

async function ensureSystemRoles() {
  const count = await Role.countDocuments();
  if (count > 0) return;
  await Role.insertMany(defaultSystemRoles());
}

function sanitize(data) {
  const out = { ...(data || {}) };
  for (const key of Object.keys(out)) {
    if (out[key] === '' || out[key] === undefined) delete out[key];
  }
  return out;
}

export async function GET(request) {
  try {
    await authorize(request, 'view-roles');
    await connectDB();
    await ensureSystemRoles();

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

    const sortField = SORT_MAP[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const [roles, total, all, active, inactive] = await Promise.all([
      Role.find(filter).sort({ [sortField]: sortDirection }).skip(skip).limit(limit).lean(),
      Role.countDocuments(filter),
      Role.countDocuments(baseFilter),
      Role.countDocuments({ ...baseFilter, status: 'active' }),
      Role.countDocuments({ ...baseFilter, status: 'inactive' }),
    ]);

    // Attach assigned-user counts (User.role stores the role name).
    const counts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    const rolesWithCounts = roles.map((r) => ({ ...r, userCount: countMap[r.name] || 0 }));

    return Response.json(
      {
        roles: rolesWithCounts,
        statusCounts: { all, active, inactive },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching roles');
  }
}

export async function POST(request) {
  try {
    const currentUser = await authorize(request, 'create-roles');
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', required: true, trim: true, messages: { required: 'Role name is required' } },
      { field: 'description', optional: true, trim: true },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    const clean = sanitize(data);
    const permissions = Array.isArray(body.permissions) ? body.permissions : [];
    if (permissions.length === 0) {
      return Response.json({ message: 'Select at least one permission' }, { status: 400 });
    }
    const invalid = permissions.filter((p) => !isValidPermission(p));
    if (invalid.length > 0) {
      return Response.json({ message: `Unknown permissions: ${invalid.join(', ')}` }, { status: 400 });
    }

    await connectDB();
    const reserved = ['superadmin', 'super admin', 'company'];
    if (reserved.includes(String(clean.name || '').toLowerCase()) && currentUser.type !== 'superadmin') {
      return Response.json({ message: 'This role name is reserved for system use' }, { status: 400 });
    }
    const existing = await Role.findOne({ name: clean.name });
    if (existing) {
      return Response.json({ message: 'A role with this name already exists' }, { status: 400 });
    }

    const role = await Role.create({ ...clean, permissions });
    return Response.json({ message: 'Role created successfully', role }, { status: 201 });
  } catch (error) {
    if (error && error.code === 11000) {
      return Response.json({ message: 'A role with this name already exists' }, { status: 400 });
    }
    return handleApiError(error, 'Server error creating role');
  }
}
