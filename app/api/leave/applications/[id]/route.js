import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import Leave from '@/lib/models/Leave';
import LeaveType from '@/lib/models/LeaveType';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validation';
import {
  addStatusHistory,
  calculateRequestDays,
  findOverlappingLeave,
  getLeaveAccess,
  isValidObjectId,
  populateLeave,
  recalculateBalancesForLeave,
  recalculateBalancesForPair,
  validateRequestBalance,
} from '@/lib/leave-server';
import { legacyLeaveType, roundDays, toUtcDate } from '@/lib/leave-utils';

function isOwner(access, leave) {
  const employeeId = leave?.employee?._id || leave?.employee;
  return Boolean(access.employee && employeeId && String(employeeId) === String(access.employee._id));
}

export async function GET(request, { params }) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    const { id } = await params;

    const leave = await populateLeave(Leave.findById(id));
    if (!leave) return Response.json({ message: 'Leave request not found' }, { status: 404 });
    if (!access.canViewAll && !isOwner(access, leave)) {
      throw new ApiError(403, 'You do not have permission to view this leave request');
    }

    return Response.json({ leave, access }, { status: 200 });
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Leave request not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching leave request');
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    const { id } = await params;

    const leave = await Leave.findById(id);
    if (!leave) return Response.json({ message: 'Leave request not found' }, { status: 404 });

    const owner = isOwner(access, leave);
    if (!access.canViewAll && !owner) {
      throw new ApiError(403, 'You do not have permission to edit this leave request');
    }
    if (!owner && !access.canEditLeave) {
      throw new ApiError(403, 'You do not have permission to edit leave requests');
    }
    if (leave.status !== 'pending') {
      throw new ApiError(409, 'Only pending leave requests can be edited');
    }

    const body = await parseJsonBody(request);
    const oldEmployee = leave.employee;
    const oldType = leave.leaveType;
    const oldDaysByYear = { ...(leave.daysByYear || {}) };

    let employee = await Employee.findById(leave.employee);
    if (!employee) throw new ApiError(404, 'Employee not found');

    if (body.employee && String(body.employee) !== String(leave.employee)) {
      if (!access.canViewAll) throw new ApiError(403, 'You cannot move a request to another employee');
      if (!isValidObjectId(body.employee)) throw new ApiError(400, 'Invalid employee');
      employee = await Employee.findById(body.employee);
      if (!employee) throw new ApiError(404, 'Employee not found');
    }

    const nextTypeId = body.leaveType || leave.leaveType;
    if (!isValidObjectId(nextTypeId)) throw new ApiError(400, 'Please select a leave type');
    const leaveType = await LeaveType.findById(nextTypeId);
    if (!leaveType) throw new ApiError(400, 'Leave type not found');
    if (String(leaveType._id) !== String(leave.leaveType) && leaveType.status !== 'active') {
      throw new ApiError(400, 'The selected leave type is inactive');
    }

    const start = body.startDate ? toUtcDate(body.startDate) : toUtcDate(leave.startDate);
    const end = body.endDate ? toUtcDate(body.endDate) : toUtcDate(leave.endDate);
    if (!start || !end) throw new ApiError(400, 'Valid start and end dates are required');
    if (end.getTime() < start.getTime()) {
      throw new ApiError(400, 'End date must be after or equal to the start date');
    }

    const today = toUtcDate(new Date());
    if (body.startDate && !access.canViewAll && start.getTime() < today.getTime()) {
      throw new ApiError(400, 'Start date cannot be in the past');
    }

    const halfDay = body.halfDay === undefined ? Boolean(leave.halfDay) : Boolean(body.halfDay);
    if (halfDay && !leaveType.allowHalfDay) {
      throw new ApiError(400, 'This leave type does not allow half-day requests');
    }
    if (halfDay && start.getTime() !== end.getTime()) {
      throw new ApiError(400, 'Half-day leave must start and end on the same date');
    }

    if (body.startDate && !access.canViewAll && Number(leaveType.minNoticeDays) > 0) {
      const daysNotice = Math.floor((start.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      if (daysNotice < Number(leaveType.minNoticeDays)) {
        throw new ApiError(
          400,
          `${leaveType.name} requires at least ${leaveType.minNoticeDays} day(s) of notice`
        );
      }
    }

    const calculation = await calculateRequestDays({
      employee,
      leaveType,
      startDate: start,
      endDate: end,
      halfDay,
    });
    if (calculation.error) throw new ApiError(400, calculation.error);

    if (
      Number(leaveType.maxConsecutiveDays) > 0 &&
      calculation.totalDays > Number(leaveType.maxConsecutiveDays)
    ) {
      throw new ApiError(
        400,
        `${leaveType.name} cannot exceed ${leaveType.maxConsecutiveDays} consecutive working day(s)`
      );
    }

    const overlap = await findOverlappingLeave({
      employeeId: employee._id,
      startDate: start,
      endDate: end,
      excludeLeaveId: leave._id,
    });
    if (overlap) {
      return Response.json(
        {
          message: `These dates overlap with an existing ${overlap.status} leave request${
            overlap.leaveType?.name ? ` (${overlap.leaveType.name})` : ''
          }.`,
        },
        { status: 409 }
      );
    }

    const balanceCheck = await validateRequestBalance({
      employeeId: employee._id,
      leaveTypeId: leaveType._id,
      leaveType,
      daysByYear: calculation.daysByYear,
      excludeLeaveId: leave._id,
    });
    if (!balanceCheck.ok) {
      return Response.json({ message: balanceCheck.message }, { status: 400 });
    }

    leave.employee = employee._id;
    leave.leaveType = leaveType._id;
    leave.type = legacyLeaveType(leaveType.code);
    leave.startDate = start;
    leave.endDate = end;
    leave.totalDays = roundDays(calculation.totalDays);
    leave.daysByYear = calculation.daysByYear;
    leave.halfDay = halfDay;
    if (body.reason !== undefined) leave.reason = body.reason ? String(body.reason).trim() : null;

    addStatusHistory(leave, 'pending', user, 'Leave request updated');
    await leave.save();

    await recalculateBalancesForPair(oldEmployee, oldType, Object.keys(oldDaysByYear));
    await recalculateBalancesForLeave(leave);

    const populated = await populateLeave(Leave.findById(leave._id));
    return Response.json(
      { message: 'Leave request updated successfully', leave: populated },
      { status: 200 }
    );
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Leave request not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating leave request');
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    const { id } = await params;

    const leave = await Leave.findById(id);
    if (!leave) return Response.json({ message: 'Leave request not found' }, { status: 404 });

    const owner = isOwner(access, leave);
    const ownerCanDelete = owner && ['pending', 'cancelled', 'rejected'].includes(leave.status);
    if (!access.canDeleteLeave && !ownerCanDelete) {
      throw new ApiError(
        403,
        'Approved leave must be cancelled before it can be deleted. Contact an administrator.'
      );
    }

    const employeeId = leave.employee;
    const leaveTypeId = leave.leaveType;
    const years = Object.keys(leave.daysByYear || {});
    if (years.length === 0 && leave.startDate) {
      years.push(String(new Date(leave.startDate).getUTCFullYear()));
    }

    await leave.deleteOne();
    await recalculateBalancesForPair(employeeId, leaveTypeId, years);

    return Response.json({ message: 'Leave request deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Leave request not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting leave request');
  }
}
