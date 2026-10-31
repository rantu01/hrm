import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import LeaveType from '@/lib/models/LeaveType';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';
import {
  calculateRequestDays,
  findOverlappingLeave,
  getBalanceSnapshots,
  getLeaveAccess,
  isValidObjectId,
} from '@/lib/leave-server';
import { toUtcDate } from '@/lib/leave-utils';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    const sp = request.nextUrl.searchParams;

    let employee;
    if (sp.get('employee')) {
      if (!isValidObjectId(sp.get('employee'))) throw new ApiError(400, 'Invalid employee');
      if (!access.canViewAll && String(sp.get('employee')) !== String(access.employee?._id || '')) {
        throw new ApiError(403, 'You can only preview your own leave');
      }
      employee = await Employee.findById(sp.get('employee'));
    } else if (access.employee) {
      employee = await Employee.findById(access.employee._id);
    }
    if (!employee) throw new ApiError(400, 'No employee profile is linked to this account');

    if (!isValidObjectId(sp.get('leaveType'))) throw new ApiError(400, 'Please select a leave type');
    const leaveType = await LeaveType.findById(sp.get('leaveType'));
    if (!leaveType) throw new ApiError(404, 'Leave type not found');

    const start = toUtcDate(sp.get('startDate') || sp.get('start'));
    const end = toUtcDate(sp.get('endDate') || sp.get('end'));
    if (!start || !end) throw new ApiError(400, 'Valid start and end dates are required');

    const halfDay = sp.get('halfDay') === 'true' || sp.get('halfDay') === '1';
    const excludeLeaveId = isValidObjectId(sp.get('exclude')) ? sp.get('exclude') : null;

    const calculation = await calculateRequestDays({
      employee,
      leaveType,
      startDate: start,
      endDate: end,
      halfDay,
    });

    const issues = [];
    if (calculation.error) issues.push(calculation.error);

    const today = toUtcDate(new Date());
    if (!access.canViewAll && start.getTime() < today.getTime()) {
      issues.push('Start date cannot be in the past');
    }
    if (halfDay && !leaveType.allowHalfDay) {
      issues.push('This leave type does not allow half-day requests');
    }
    if (halfDay && start.getTime() !== end.getTime()) {
      issues.push('Half-day leave must start and end on the same date');
    }
    if (!access.canViewAll && Number(leaveType.minNoticeDays) > 0) {
      const notice = Math.floor((start.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      if (notice < Number(leaveType.minNoticeDays)) {
        issues.push(`${leaveType.name} requires at least ${leaveType.minNoticeDays} day(s) of notice`);
      }
    }
    if (
      Number(leaveType.maxConsecutiveDays) > 0 &&
      calculation.totalDays > Number(leaveType.maxConsecutiveDays)
    ) {
      issues.push(
        `${leaveType.name} cannot exceed ${leaveType.maxConsecutiveDays} consecutive working day(s)`
      );
    }

    let overlap = null;
    if (!calculation.error) {
      overlap = await findOverlappingLeave({
        employeeId: employee._id,
        startDate: start,
        endDate: end,
        excludeLeaveId,
      });
      if (overlap) {
        issues.push(
          `These dates overlap with an existing ${overlap.status} request${
            overlap.leaveType?.name ? ` (${overlap.leaveType.name})` : ''
          }`
        );
      }
    }

    let snapshots = [];
    if (!calculation.error && leaveType.isPaid !== false) {
      snapshots = await getBalanceSnapshots({
        employeeId: employee._id,
        leaveTypeId: leaveType._id,
        daysByYear: calculation.daysByYear,
        excludeLeaveId,
        leaveType,
      });
      for (const snapshot of snapshots) {
        const requested = Number(calculation.daysByYear?.[snapshot.year] || 0);
        if (requested > snapshot.available) {
          issues.push(
            `Insufficient balance for ${snapshot.year}: requested ${requested}, available ${snapshot.available} day(s)`
          );
        }
      }
    }

    return Response.json(
      {
        employee: { _id: employee._id, name: employee.name, employee_id: employee.employee_id },
        leaveType: {
          _id: leaveType._id,
          name: leaveType.name,
          code: leaveType.code,
          allowHalfDay: leaveType.allowHalfDay,
          requiresApproval: leaveType.requiresApproval,
          isPaid: leaveType.isPaid,
          maxConsecutiveDays: leaveType.maxConsecutiveDays,
          minNoticeDays: leaveType.minNoticeDays,
        },
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        halfDay,
        totalDays: calculation.totalDays || 0,
        daysByYear: calculation.daysByYear || {},
        excluded: calculation.excluded || [],
        balances: snapshots,
        overlap: overlap
          ? {
              _id: overlap._id,
              status: overlap.status,
              startDate: overlap.startDate,
              endDate: overlap.endDate,
              leaveType: overlap.leaveType,
            }
          : null,
        issues,
        canApply: issues.length === 0 && !calculation.error,
        access,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error previewing leave request');
  }
}
