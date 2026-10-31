import connectDB from '@/lib/db';
import LeaveType from '@/lib/models/LeaveType';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';
import { getLeaveAccess } from '@/lib/leave-server';

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    if (!access.canManageTypes) {
      throw new ApiError(403, 'You do not have permission to manage leave types');
    }

    const { id } = await params;
    const leaveType = await LeaveType.findById(id);
    if (!leaveType) return Response.json({ message: 'Leave type not found' }, { status: 404 });

    leaveType.status = leaveType.status === 'active' ? 'inactive' : 'active';
    await leaveType.save();

    return Response.json(
      {
        message: `Leave type ${leaveType.status === 'active' ? 'activated' : 'deactivated'} successfully`,
        leaveType,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Leave type not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating leave type status');
  }
}
