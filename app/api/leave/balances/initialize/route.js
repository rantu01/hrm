import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import LeaveType from '@/lib/models/LeaveType';
import LeaveBalance from '@/lib/models/LeaveBalance';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validation';
import {
  getLeaveAccess,
  isValidObjectId,
  recalculateLeaveBalance,
} from '@/lib/leave-server';

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    if (!access.canManageBalances) {
      throw new ApiError(403, 'You do not have permission to manage leave balances');
    }

    const body = await parseJsonBody(request);
    const year = parseInt(body.year, 10) || new Date().getUTCFullYear();
    if (year < 2000 || year > 2100) throw new ApiError(400, 'Please provide a valid year');

    const employeeFilter = { employee_status: { $in: ['active', 'probation'] } };
    if (body.employee) {
      if (!isValidObjectId(body.employee)) throw new ApiError(400, 'Invalid employee');
      employeeFilter._id = body.employee;
    }

    const [employees, leaveTypes] = await Promise.all([
      Employee.find(employeeFilter).select('_id name').lean(),
      LeaveType.find({ status: 'active' }).select('_id name annualAllocation').lean(),
    ]);

    if (employees.length === 0 || leaveTypes.length === 0) {
      return Response.json(
        {
          message: 'Add active employees and leave types before initialising balances',
          created: 0,
          skipped: 0,
          total: 0,
        },
        { status: 200 }
      );
    }

    const operations = [];
    for (const employee of employees) {
      for (const leaveType of leaveTypes) {
        operations.push({
          updateOne: {
            filter: { employee: employee._id, leaveType: leaveType._id, year },
            update: {
              $setOnInsert: {
                employee: employee._id,
                leaveType: leaveType._id,
                year,
                allocated: Number(leaveType.annualAllocation) || 0,
                carryForward: 0,
                adjustment: 0,
                adjustmentReason: null,
                used: 0,
                pending: 0,
              },
            },
            upsert: true,
          },
        });
      }
    }

    const result = await LeaveBalance.bulkWrite(operations, { ordered: false });
    const upsertedIndexes = Object.keys(result.upsertedIds || {}).map(Number);

    for (const index of upsertedIndexes) {
      const operation = operations[index];
      const { employee, leaveType } = operation.updateOne.filter;
      const type = leaveTypes.find((row) => String(row._id) === String(leaveType));
      await recalculateLeaveBalance(employee, leaveType, year, type);
    }

    const created = result.upsertedCount || upsertedIndexes.length;

    return Response.json(
      {
        message:
          created > 0
            ? `${created} leave balance record(s) created for ${year}`
            : `All employee balances already exist for ${year}`,
        created,
        skipped: operations.length - created,
        total: operations.length,
      },
      { status: created > 0 ? 201 : 200 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json(
        { message: 'Some balances already exist. Refresh the page to see the latest data.' },
        { status: 409 }
      );
    }
    return handleApiError(error, 'Server error initialising leave balances');
  }
}