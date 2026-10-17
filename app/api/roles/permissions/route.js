import connectDB from '@/lib/db';
import Role from '@/lib/models/Role';
import { requireAuth, requirePermission, handleApiError } from '@/lib/auth';
import { PERMISSION_GROUPS } from '@/lib/permissions';

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

// @route   GET /api/roles/permissions
// @desc    Permission catalog used by the role form (grouped)
// @access  Private
export async function GET(request) {
  try {
    await authorize(request, 'view-roles');
    return Response.json({ groups: PERMISSION_GROUPS }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching permissions');
  }
}
