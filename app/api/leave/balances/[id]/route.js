import connectDB from '@/lib/db';
import LeaveType from '@/lib/models/LeaveType';
import LeaveBalance from '@/lib/models/LeaveBalance';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validation';
import { getLeaveAccess, recalculateLeaveBalance } from '@/lib/leave-server';
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

async function loadBalance(id) {
  return LeaveBalance.findById(id)
    .populate({
      path: 'employee',
      select: 'name email employee_id department_id designation_id',
      populate: [
        { path: 'department_id', select: 'name' },
        { path: 'designation_id', select: 'name' },
      ],
    })
    .populate('leaveType', 'name code color isPaid');
}

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    if (!access.canManageBalances) {
      throw new ApiError(403, 'You do not have permission to manage leave balances');
    }

    const { id } = await params;
    const balance = await LeaveBalance.findById(id);
    if (!balance) return Response.json({ message: 'Leave balance not found' }, { status: 404 });

    const body = await parseJsonBody(request);
    if (body.allocated !== undefined) {
      balance.allocated = numberValue(body.allocated, 0, 'Allocated days');
    }
    if (body.carryForward !== undefined) {
      balance.carryForward = numberValue(body.carryForward, 0, 'Carry forward days');
    }
    if (body.adjustment !== undefined) {
      balance.adjustment = numberValue(body.adjustment, 0, 'Adjustment', { allowNegative: true });
    }
    if (body.adjustmentReason !== undefined) {
      balance.adjustmentReason = body.adjustmentReason ? String(body.adjustmentReason).trim() : null;
    }
    if (body.notes !== undefined) {
      balance.notes = body.notes ? String(body.notes).trim() : null;
    }

    await balance.save();
    const leaveType = await LeaveType.findById(balance.leaveType).lean();
    await recalculateLeaveBalance(balance.employee, balance.leaveType, balance.year, leaveType);

    const populated = await loadBalance(balance._id);
    return Response.json(
      { message: 'Leave balance updated successfully', balance: withAvailable(populated) },
      { status: 200 }
    );
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Leave balance not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating leave balance');
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    if (!access.canManageBalances) {
      throw new ApiError(403, 'You do not have permission to manage leave balances');
    }

    const { id } = await params;
    const balance = await LeaveBalance.findById(id);
    if (!balance) return Response.json({ message: 'Leave balance not found' }, { status: 404 });

    const leaveType = await LeaveType.findById(balance.leaveType).lean();
    const refreshed = await recalculateLeaveBalance(
      balance.employee,
      balance.leaveType,
      balance.year,
      leaveType
    );

    if (Number(refreshed.used) > 0 || Number(refreshed.pending) > 0) {
      return Response.json(
        {
          message:
            'This balance is linked to leave requests and cannot be deleted. Adjust the allocation instead.',
        },
        { status: 409 }
      );
    }

    await refreshed.deleteOne();

    return Response.json({ message: 'Leave balance deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Leave balance not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting leave balance');
  }
}
