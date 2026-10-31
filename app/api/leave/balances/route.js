import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import LeaveType from '@/lib/models/LeaveType';
import LeaveBalance from '@/lib/models/LeaveBalance';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validation';
import {
  getLeaveAccess,
  isValidObjectId,
  parsePagination,
  recalculateLeaveBalance,
} from '@/lib/leave-server';
import { roundDays } from '@/lib/leave-utils';

function numberValue(value, fallback, field, { min = 0, max = 3650, allowNegative = false } = {}) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  const lower = allowNegative ? -max : min;
  if (!Number.isFinite(parsed) || parsed < lower || parsed > max) {
    throw new ApiError(400, `${field} must be a number between ${lower} and ${max}`);
  }
  return parsed;
}

function withAvailable(balance) {
  const row = balance.toObject ? balance.toObject({ virtuals: true }) : { ...balance };
  row.available = roundDays(
    (Number(row.allocated) || 0) +
      (Number(row.carryForward) || 0) +
      (Number(row.adjustment) || 0) -
      (Number(row.used) || 0) -
      (Number(row.pending) || 0)
  );
  return row;
}

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    const sp = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(sp, 10);

    const year = parseInt(sp.get('year'), 10) || new Date().getUTCFullYear();
    const and = [{ year }];

    if (!access.canViewAll && !access.canManageBalances) {
      if (!access.employee) {
        return Response.json(
          {
            balances: [],
            summary: { allocated: 0, used: 0, pending: 0, available: 0, count: 0 },
            pagination: { page: 1, limit, total: 0, pages: 1 },
            year,
            access,
          },
          { status: 200 }
        );
      }
      and.push({ employee: access.employee._id });
    } else if (sp.get('employee')) {
      if (!isValidObjectId(sp.get('employee'))) throw new ApiError(400, 'Invalid employee filter');
      and.push({ employee: sp.get('employee') });
    }

    if (sp.get('leave_type')) {
      if (!isValidObjectId(sp.get('leave_type'))) throw new ApiError(400, 'Invalid leave type filter');
      and.push({ leaveType: sp.get('leave_type') });
    }

    const search = (sp.get('search') || '').trim();
    if (search) {
      const rx = { $regex: search, $options: 'i' };
      const employees = await Employee.find({
        $or: [{ name: rx }, { email: rx }, { employee_id: rx }],
      })
        .select('_id')
        .limit(1000)
        .lean();
      and.push({ employee: { $in: employees.map((row) => row._id) } });
    }

    const filter = { $and: and };
    const sortMap = {
      year: 'year',
      allocated: 'allocated',
      used: 'used',
      pending: 'pending',
      created_at: 'createdAt',
      createdAt: 'createdAt',
    };
    const sortField = sortMap[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const [balances, total, summaryRows] = await Promise.all([
      LeaveBalance.find(filter)
        .populate({
          path: 'employee',
          select: 'name email employee_id department_id designation_id',
          populate: [
            { path: 'department_id', select: 'name' },
            { path: 'designation_id', select: 'name' },
          ],
        })
        .populate('leaveType', 'name code color isPaid')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit),
      LeaveBalance.countDocuments(filter),
      LeaveBalance.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            allocated: { $sum: '$allocated' },
            carryForward: { $sum: '$carryForward' },
            adjustment: { $sum: '$adjustment' },
            used: { $sum: '$used' },
            pending: { $sum: '$pending' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summaryRow = summaryRows[0] || {
      allocated: 0,
      carryForward: 0,
      adjustment: 0,
      used: 0,
      pending: 0,
      count: 0,
    };
    const summary = {
      count: summaryRow.count || 0,
      allocated: roundDays(summaryRow.allocated),
      carryForward: roundDays(summaryRow.carryForward),
      adjustment: roundDays(summaryRow.adjustment),
      used: roundDays(summaryRow.used),
      pending: roundDays(summaryRow.pending),
      available: roundDays(
        (summaryRow.allocated || 0) +
          (summaryRow.carryForward || 0) +
          (summaryRow.adjustment || 0) -
          (summaryRow.used || 0) -
          (summaryRow.pending || 0)
      ),
    };

    return Response.json(
      {
        balances: balances.map(withAvailable),
        summary,
        year,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        access,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching leave balances');
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    if (!access.canManageBalances) {
      throw new ApiError(403, 'You do not have permission to manage leave balances');
    }

    const body = await parseJsonBody(request);
    if (!isValidObjectId(body.employee)) throw new ApiError(400, 'Please select an employee');
    if (!isValidObjectId(body.leaveType)) throw new ApiError(400, 'Please select a leave type');

    const year = parseInt(body.year, 10);
    if (!year || year < 2000 || year > 2100) throw new ApiError(400, 'Please provide a valid year');

    const [employee, leaveType] = await Promise.all([
      Employee.findById(body.employee),
      LeaveType.findById(body.leaveType),
    ]);
    if (!employee) throw new ApiError(404, 'Employee not found');
    if (!leaveType) throw new ApiError(404, 'Leave type not found');

    const existing = await LeaveBalance.findOne({
      employee: employee._id,
      leaveType: leaveType._id,
      year,
    });
    if (existing) {
      throw new ApiError(
        409,
        'A balance already exists for this employee, leave type and year. Edit the existing balance instead.'
      );
    }

    const balance = await LeaveBalance.create({
      employee: employee._id,
      leaveType: leaveType._id,
      year,
      allocated: numberValue(body.allocated, leaveType.annualAllocation, 'Allocated days'),
      carryForward: numberValue(body.carryForward, 0, 'Carry forward days'),
      adjustment: numberValue(body.adjustment, 0, 'Adjustment', { allowNegative: true }),
      adjustmentReason: body.adjustmentReason ? String(body.adjustmentReason).trim() : null,
      notes: body.notes ? String(body.notes).trim() : null,
    });

    await recalculateLeaveBalance(employee._id, leaveType._id, year, leaveType);

    const populated = await LeaveBalance.findById(balance._id)
      .populate({
        path: 'employee',
        select: 'name email employee_id department_id designation_id',
        populate: [
          { path: 'department_id', select: 'name' },
          { path: 'designation_id', select: 'name' },
        ],
      })
      .populate('leaveType', 'name code color isPaid');

    return Response.json(
      { message: 'Leave balance created successfully', balance: withAvailable(populated) },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json(
        { message: 'A balance already exists for this employee, leave type and year' },
        { status: 409 }
      );
    }
    return handleApiError(error, 'Server error creating leave balance');
  }
}
