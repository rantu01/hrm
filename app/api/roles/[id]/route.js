import connectDB from '@/lib/db';
import Role from '@/lib/models/Role';
import User from '@/lib/models/User';
import { requireAuth, requirePermission, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import { isValidPermission } from '@/lib/permissions';

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

// @route   GET /api/roles/:id
export async function GET(request, { params }) {
  try {
    await authorize(request, 'view-roles');
    await connectDB();
    const { id } = await params;
    const role = await Role.findById(id).lean();
    if (!role) return Response.json({ message: 'Role not found' }, { status: 404 });
    role.userCount = await User.countDocuments({ role: role.name });
    return Response.json({ role }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Role not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching role');
  }
}

// @route   PUT /api/roles/:id
export async function PUT(request, { params }) {
  try {
    const currentUser = await authorize(request, 'edit-roles');
    const { id } = await params;
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', optional: true, trim: true },
      { field: 'description', optional: true, trim: true },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    await connectDB();
    const role = await Role.findById(id);
    if (!role) return Response.json({ message: 'Role not found' }, { status: 404 });

    const clean = sanitize(data);
    // System roles keep their identity; only description/permissions/status may change.
    if (role.isSystem) delete clean.name;
    const reserved = ['superadmin', 'super admin', 'company'];

    if (clean.name && clean.name !== role.name) {
      if (reserved.includes(String(clean.name).toLowerCase()) && currentUser.type !== 'superadmin') {
        return Response.json({ message: 'This role name is reserved for system use' }, { status: 400 });
      }
      const existing = await Role.findOne({ name: clean.name, _id: { $ne: role._id } });
      if (existing) {
        return Response.json({ message: 'A role with this name already exists' }, { status: 400 });
      }
    }

    if (body.permissions !== undefined) {
      if (!Array.isArray(body.permissions)) {
        return Response.json({ message: 'Permissions must be an array' }, { status: 400 });
      }
      if (body.permissions.length === 0) {
        return Response.json({ message: 'Select at least one permission' }, { status: 400 });
      }
      const invalid = body.permissions.filter((p) => !isValidPermission(p));
      if (invalid.length > 0) {
        return Response.json({ message: `Unknown permissions: ${invalid.join(', ')}` }, { status: 400 });
      }
      clean.permissions = body.permissions;
    }

    const oldName = role.name;
    Object.assign(role, clean);
    await role.save();

    // Users store the role name, so renaming re-points assignments to stay intact.
    if (clean.name && clean.name !== oldName) {
      await User.updateMany({ role: oldName }, { $set: { role: clean.name } });
    }

    return Response.json({ message: 'Role updated successfully', role }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Role not found' }, { status: 404 });
    }
    if (error && error.code === 11000) {
      return Response.json({ message: 'A role with this name already exists' }, { status: 400 });
    }
    return handleApiError(error, 'Server error updating role');
  }
}

// @route   DELETE /api/roles/:id
export async function DELETE(request, { params }) {
  try {
    await authorize(request, 'delete-roles');
    await connectDB();
    const { id } = await params;
    const role = await Role.findById(id);
    if (!role) return Response.json({ message: 'Role not found' }, { status: 404 });
    if (role.isSystem) {
      return Response.json({ message: 'System roles cannot be deleted' }, { status: 400 });
    }
    const assigned = await User.countDocuments({ role: role.name });
    if (assigned > 0) {
      return Response.json(
        { message: `Cannot delete role: ${assigned} user(s) are assigned to it` },
        { status: 400 }
      );
    }
    await role.deleteOne();
    return Response.json({ message: 'Role deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Role not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting role');
  }
}
