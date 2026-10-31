import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import Leave from '@/lib/models/Leave';
import LeaveType from '@/lib/models/LeaveType';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';
import {
  addStatusHistory,
  getLeaveAccess,
  notifyUsers,
  populateLeave,
  recalculateBalancesForLeave,
} from '@/lib/leave-server';

export async function POST(request, { params }) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    if (!access.canApprove) {
      throw new ApiError(403, 'You do not have permission to reject leave requests');
    }

    const { id } = await params;
    const leave = await Leave.findById(id);
    if (!leave) return Response.json({ message: 'Leave request not found' }, { status: 404 });
    if (leave.status !== 'pending') {
      throw new ApiError(409, `This request is already ${leave.status}`);
    }

    const employee = await Employee.findById(leave.employee).select('name user');
    if (!employee) throw new ApiError(404, 'Employee not found');

    if (employee.user && String(employee.user) === String(user._id)) {
      throw new ApiError(403, 'You cannot reject your own leave request');
    }

    const body = await request.json().catch(() => ({}));
    const reason = String(body?.reason || '').trim();
    if (!reason) throw new ApiError(400, 'A rejection reason is required');
    if (reason.length > 500) throw new ApiError(400, 'Rejection reason cannot exceed 500 characters');

    const leaveType = await LeaveType.findById(leave.leaveType);

    leave.status = 'rejected';
    leave.approvedBy = user._id;
    leave.approvedAt = new Date();
    leave.rejectionReason = reason;
    addStatusHistory(leave, 'rejected', user, reason);
    await leave.save();
    await recalculateBalancesForLeave(leave);

    if (employee.user) {
      await notifyUsers([employee.user], {
        type: 'rejected',
        title: `Your ${leaveType?.name || 'leave'} request was rejected`,
        message: `Request for ${Number(leave.totalDays)} day(s) from ${new Date(leave.startDate)
          .toISOString()
          .slice(0, 10)} to ${new Date(leave.endDate).toISOString().slice(0, 10)} was rejected. Reason: ${reason}`,
        leave: leave._id,
        link: '/leave/applications',
      });
    }

    const populated = await populateLeave(Leave.findById(leave._id));
    return Response.json(
      { message: 'Leave request rejected', leave: populated },
      { status: 200 }
    );
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Leave request not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error rejecting leave request');
  }
}
