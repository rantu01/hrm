import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import Leave from '@/lib/models/Leave';
import LeaveType from '@/lib/models/LeaveType';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validation';
import {
  addStatusHistory,
  calculateRequestDays,
  ensureLeaveBalance,
  findOverlappingLeave,
  getEmployeeUserId,
  getLeaveAccess,
  isValidObjectId,
  notifyApprovers,
  notifyUsers,
  parsePagination,
  populateLeave,
  recalculateBalancesForLeave,
  validateRequestBalance,
} from '@/lib/leave-server';
import {
  legacyLeaveType,
  roundDays,
  toUtcDate,
} from '@/lib/leave-utils';

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function emptyResponse(access) {
  return Response.json(
    {
      leaves: [],
      statusCounts: { all: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 },
      pagination: { page: 1, limit: 10, total: 0, pages: 1 },
      access,
    },
    { status: 200 }
  );
}

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);

    if (!access.canViewAll && !access.employee) {
      return emptyResponse(access);
    }

    const sp = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(sp, 10);
    const and = [];

    // Scope: regular employees only ever see their own requests.
    if (!access.canViewAll) {
      and.push({ employee: access.employee._id });
    } else if (sp.get('employee')) {
      if (!isValidObjectId(sp.get('employee'))) {
        throw new ApiError(400, 'Invalid employee filter');
      }
      and.push({ employee: sp.get('employee') });
    }

    if (sp.get('leave_type')) {
      if (!isValidObjectId(sp.get('leave_type'))) {
        throw new ApiError(400, 'Invalid leave type filter');
      }
      and.push({ leaveType: sp.get('leave_type') });
    }

    const search = (sp.get('search') || '').trim();
    if (search) {
      const rx = { $regex: search, $options: 'i' };
      const [employees, types] = await Promise.all([
        Employee.find({ $or: [{ name: rx }, { email: rx }, { employee_id: rx }] })
          .select('_id')
          .limit(1000)
          .lean(),
        LeaveType.find({ $or: [{ name: rx }, { code: rx }] })
          .select('_id')
          .limit(200)
          .lean(),
      ]);
      and.push({
        $or: [
          { reason: rx },
          { rejectionReason: rx },
          { employee: { $in: employees.map((row) => row._id) } },
          { leaveType: { $in: types.map((row) => row._id) } },
        ],
      });
    }

    const dateFrom = sp.get('date_from');
    const dateTo = sp.get('date_to');
    if (dateFrom) {
      const from = toUtcDate(dateFrom);
      if (!from) throw new ApiError(400, 'Invalid start of date range');
      and.push({ endDate: { $gte: from } });
    }
    if (dateTo) {
      const to = toUtcDate(dateTo);
      if (!to) throw new ApiError(400, 'Invalid end of date range');
      and.push({ startDate: { $lte: to } });
    }

    const baseFilter = and.length > 0 ? { $and: and } : {};
    const status = sp.get('status');
    const filter =
      status && status !== 'all'
        ? { $and: [...and, { status }] }
        : baseFilter;

    const sortMap = {
      created_at: 'createdAt',
      createdAt: 'createdAt',
      start_date: 'startDate',
      startDate: 'startDate',
      end_date: 'endDate',
      endDate: 'endDate',
      total_days: 'totalDays',
      totalDays: 'totalDays',
      status: 'status',
    };
    const sortField = sortMap[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const [leaves, total, statusRows] = await Promise.all([
      populateLeave(
        Leave.find(filter)
          .sort({ [sortField]: sortDirection, createdAt: -1 })
          .skip(skip)
          .limit(limit)
      ),
      Leave.countDocuments(filter),
      Leave.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = { all: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    for (const row of statusRows) {
      if (row._id && row._id in statusCounts) statusCounts[row._id] = row.count;
      statusCounts.all += row.count;
    }

    return Response.json(
      {
        leaves,
        statusCounts,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        access,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching leave applications');
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);

    const body = await parseJsonBody(request);

    // Resolve the employee the leave belongs to.
    let employee;
    if (body.employee) {
      if (!isValidObjectId(body.employee)) throw new ApiError(400, 'Invalid employee');
      if (!access.canViewAll && String(body.employee) !== String(access.employee?._id || '')) {
        throw new ApiError(403, 'You can only apply for your own leave');
      }
      employee = await Employee.findById(body.employee);
    } else if (access.employee) {
      employee = await Employee.findById(access.employee._id);
    }

    if (!employee) {
      throw new ApiError(
        400,
        'No employee profile is linked to this account. Please contact an administrator.'
      );
    }
    if (employee.employee_status === 'terminated') {
      throw new ApiError(400, 'Leave cannot be requested for a terminated employee');
    }

    if (!isValidObjectId(body.leaveType)) throw new ApiError(400, 'Please select a leave type');
    const leaveType = await LeaveType.findById(body.leaveType);
    if (!leaveType) throw new ApiError(400, 'Leave type not found');
    if (leaveType.status !== 'active') {
      throw new ApiError(400, 'The selected leave type is inactive');
    }

    const start = toUtcDate(body.startDate);
    const end = toUtcDate(body.endDate);
    if (!start || !end) throw new ApiError(400, 'Valid start and end dates are required');
    if (end.getTime() < start.getTime()) {
      throw new ApiError(400, 'End date must be after or equal to the start date');
    }

    const today = toUtcDate(new Date());
    if (!access.canViewAll && start.getTime() < today.getTime()) {
      throw new ApiError(400, 'Start date cannot be in the past');
    }

    const halfDay = Boolean(body.halfDay);
    if (halfDay && !leaveType.allowHalfDay) {
      throw new ApiError(400, 'This leave type does not allow half-day requests');
    }
    if (halfDay && start.getTime() !== end.getTime()) {
      throw new ApiError(400, 'Half-day leave must start and end on the same date');
    }

    if (!access.canViewAll && Number(leaveType.minNoticeDays) > 0) {
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

    if (Number(leaveType.maxConsecutiveDays) > 0 && calculation.totalDays > Number(leaveType.maxConsecutiveDays)) {
      throw new ApiError(
        400,
        `${leaveType.name} cannot exceed ${leaveType.maxConsecutiveDays} consecutive working day(s)`
      );
    }

    const overlap = await findOverlappingLeave({
      employeeId: employee._id,
      startDate: start,
      endDate: end,
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
    });
    if (!balanceCheck.ok) {
      return Response.json({ message: balanceCheck.message }, { status: 400 });
    }

    // Create the balance rows for each affected year before recording the leave.
    for (const year of Object.keys(calculation.daysByYear)) {
      await ensureLeaveBalance(employee._id, leaveType._id, Number(year), leaveType);
    }

    const autoApprove = !leaveType.requiresApproval;
    const now = new Date();
    const leave = new Leave({
      employee: employee._id,
      leaveType: leaveType._id,
      type: legacyLeaveType(leaveType.code),
      startDate: start,
      endDate: end,
      totalDays: roundDays(calculation.totalDays),
      daysByYear: calculation.daysByYear,
      halfDay,
      reason: body.reason ? String(body.reason).trim() : null,
      status: autoApprove ? 'approved' : 'pending',
      appliedBy: user._id,
      approvedBy: null,
      approvedAt: autoApprove ? now : null,
      statusHistory: [],
    });

    addStatusHistory(
      leave,
      autoApprove ? 'approved' : 'pending',
      user,
      autoApprove ? 'Automatically approved — this leave type does not require approval' : 'Leave request submitted'
    );

    await leave.save();
    await recalculateBalancesForLeave(leave);

    if (!autoApprove) {
      await notifyApprovers(
        {
          type: 'application',
          title: `${employee.name} requested ${leaveType.name}`,
          message: `${calculation.totalDays} day(s) from ${start.toISOString().slice(0, 10)} to ${end
            .toISOString()
            .slice(0, 10)}. Review the request in Leave Applications.`,
          leave: leave._id,
          link: '/leave/applications',
        },
        user._id
      );
    } else {
      const employeeUserId = await getEmployeeUserId(employee._id);
      await notifyUsers(employeeUserId ? [employeeUserId] : [], {
        type: 'approved',
        title: `Your ${leaveType.name} request was approved`,
        message: `${calculation.totalDays} day(s) from ${start.toISOString().slice(0, 10)} to ${end
          .toISOString()
          .slice(0, 10)} was automatically approved.`,
        leave: leave._id,
        link: '/leave/applications',
      });
    }

    const populated = await populateLeave(Leave.findById(leave._id));

    return Response.json(
      {
        message: autoApprove ? 'Leave approved automatically' : 'Leave request submitted successfully',
        leave: populated,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error submitting leave request');
  }
}
