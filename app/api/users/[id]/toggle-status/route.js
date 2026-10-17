import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Role from '@/lib/models/Role';
import { requireAuth, requirePermission, handleApiError } from '@/lib/auth';

const PUBLIC_SELECT = 'name email type role avatar status createdAt updatedAt';

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

// @route   PUT /api/users/:id/toggle-status
// @desc    Flip active <-> inactive (suspended accounts stay suspended)
export async function PUT(request, { params }) {
  try {
    const currentUser = await authorize(request, 'toggle-status-users');
    await connectDB();
    const { id } = await params;
    if (String(id) === String(currentUser._id)) {
      return Response.json({ message: 'You cannot deactivate your own account' }, { status: 400 });
    }
    const user = await User.findById(id);
    if (!user) return Response.json({ message: 'User not found' }, { status: 404 });
    if (user.status === 'suspended') {
      return Response.json({ message: 'Suspended accounts cannot be toggled here' }, { status: 400 });
    }
    user.status = user.status === 'active' ? 'inactive' : 'active';
    await user.save();
    const fresh = await User.findById(id).select(PUBLIC_SELECT).lean();
    return Response.json({ message: 'User status updated successfully', user: fresh }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'User not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating user status');
  }
}
