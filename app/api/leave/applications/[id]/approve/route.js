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
  validateRequestBalance,
} from '@/lib/leave-server';

export async function POST(request, { params }) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    if (!access.canApprove) {
      throw new ApiError(403, 'You do not have permission to approve leave requests');
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
      throw new ApiError(403, 'You cannot approve your own leave request');
    }

    const leaveType = await LeaveType.findById(leave.leaveType);
    const daysByYear =
      leave.daysByYear && Object.keys(leave.daysByYear).length > 0
        ? leave.daysByYear
        : { [String(new Date(leave.startDate).getUTCFullYear())]: Number(leave.totalDays) || 0 };

    const balanceCheck = await validateRequestBalance({
      employeeId: leave.employee,
      leaveTypeId: leave.leaveType,
      leaveType,
      daysByYear,
      excludeLeaveId: leave._id,
    });
    if (!balanceCheck.ok) {
      return Response.json({ message: balanceCheck.message }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const note = body?.note ? String(body.note).trim() : null;
    if (note && note.length > 500) {
      throw new ApiError(400, 'Note cannot exceed 500 characters');
    }

    leave.status = 'approved';
    leave.approvedBy = user._id;
    leave.approvedAt = new Date();
    leave.rejectionReason = null;
    addStatusHistory(leave, 'approved', user, note || 'Leave request approved');
    await leave.save();
    await recalculateBalancesForLeave(leave);

    if (employee.user) {
      await notifyUsers([employee.user], {
        type: 'approved',
        title: `Your ${leaveType?.name || 'leave'} request was approved`,
        message: `${Number(leave.totalDays)} day(s) from ${new Date(leave.startDate)
          .toISOString()
          .slice(0, 10)} to ${new Date(leave.endDate).toISOString().slice(0, 10)} ${
          note ? `— ${note}` : 'was approved.'
        }`,
        leave: leave._id,
        link: '/leave/applications',
      });
    }

    const populated = await populateLeave(Leave.findById(leave._id));
    return Response.json(
      { message: 'Leave request approved successfully', leave: populated },
      { status: 200 }
    );
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Leave request not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error approving leave request');
  }
}
