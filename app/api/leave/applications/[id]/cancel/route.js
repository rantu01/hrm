import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import Leave from '@/lib/models/Leave';
import LeaveType from '@/lib/models/LeaveType';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';
import {
  addStatusHistory,
  getLeaveAccess,
  notifyApprovers,
  notifyUsers,
  populateLeave,
  recalculateBalancesForLeave,
} from '@/lib/leave-server';
import { toUtcDate } from '@/lib/leave-utils';

function isOwner(access, leave) {
  return Boolean(
    access.employee && leave?.employee && String(leave.employee) === String(access.employee._id)
  );
}

export async function POST(request, { params }) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    const { id } = await params;

    const leave = await Leave.findById(id);
    if (!leave) return Response.json({ message: 'Leave request not found' }, { status: 404 });

    const owner = isOwner(access, leave);
    if (!owner && !access.canViewAll) {
      throw new ApiError(403, 'You do not have permission to cancel this leave request');
    }
    if (!['pending', 'approved'].includes(leave.status)) {
      throw new ApiError(409, `A ${leave.status} request cannot be cancelled`);
    }

    const today = toUtcDate(new Date());
    if (
      leave.status === 'approved' &&
      !access.canViewAll &&
      new Date(leave.startDate).getTime() <= today.getTime()
    ) {
      throw new ApiError(409, 'Leave that has already started cannot be cancelled online. Contact HR.');
    }

    const body = await request.json().catch(() => ({}));
    const reason = body?.reason ? String(body.reason).trim() : null;
    if (reason && reason.length > 500) {
      throw new ApiError(400, 'Cancellation reason cannot exceed 500 characters');
    }

    const employee = await Employee.findById(leave.employee).select('name user');
    const leaveType = await LeaveType.findById(leave.leaveType);

    leave.status = 'cancelled';
    leave.cancelledBy = user._id;
    leave.cancelledAt = new Date();
    leave.cancellationReason = reason;
    addStatusHistory(leave, 'cancelled', user, reason || 'Leave request cancelled');
    await leave.save();
    await recalculateBalancesForLeave(leave);

    if (employee?.user) {
      if (String(employee.user) !== String(user._id)) {
        await notifyUsers([employee.user], {
          type: 'cancelled',
          title: `Your ${leaveType?.name || 'leave'} request was cancelled`,
          message: `Request for ${Number(leave.totalDays)} day(s) from ${new Date(leave.startDate)
            .toISOString()
            .slice(0, 10)} to ${new Date(leave.endDate).toISOString().slice(0, 10)} was cancelled${
            reason ? `: ${reason}` : '.'
          }`,
          leave: leave._id,
          link: '/leave/applications',
        });
      } else {
        await notifyApprovers(
          {
            type: 'cancelled',
            title: `${employee.name} cancelled a leave request`,
            message: `${leaveType?.name || 'Leave'} from ${new Date(leave.startDate)
              .toISOString()
              .slice(0, 10)} to ${new Date(leave.endDate).toISOString().slice(0, 10)} was cancelled${
              reason ? `: ${reason}` : '.'
            }`,
            leave: leave._id,
            link: '/leave/applications',
          },
          user._id
        );
      }
    }

    const populated = await populateLeave(Leave.findById(leave._id));
    return Response.json(
      { message: 'Leave request cancelled successfully', leave: populated },
      { status: 200 }
    );
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Leave request not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error cancelling leave request');
  }
}
