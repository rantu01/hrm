import connectDB from '@/lib/db';
import Role from '@/lib/models/Role';
import { requireAuth, requirePermission, handleApiError } from '@/lib/auth';

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

// @route   PUT /api/roles/:id/toggle-status
export async function PUT(request, { params }) {
  try {
    await authorize(request, 'toggle-status-roles');
    await connectDB();
    const { id } = await params;
    const role = await Role.findById(id);
    if (!role) return Response.json({ message: 'Role not found' }, { status: 404 });
    if (role.isSystem) {
      return Response.json({ message: 'System roles must stay active' }, { status: 400 });
    }
    role.status = role.status === 'active' ? 'inactive' : 'active';
    await role.save();
    return Response.json({ message: 'Role status updated successfully', role }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Role not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating role status');
  }
}
