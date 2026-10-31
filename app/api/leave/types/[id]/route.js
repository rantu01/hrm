import connectDB from '@/lib/db';
import LeaveType from '@/lib/models/LeaveType';
import Leave from '@/lib/models/Leave';
import LeaveBalance from '@/lib/models/LeaveBalance';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validation';
import { getLeaveAccess } from '@/lib/leave-server';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const CODE_RE = /^[A-Z0-9_-]+$/;

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function boolValue(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === 1 || value === '1';
}

function numberValue(value, fallback, field, { min = 0, max = 365 } = {}) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new ApiError(400, `${field} must be a number between ${min} and ${max}`);
  }
  return parsed;
}

export async function GET(request, { params }) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const access = await getLeaveAccess(user);

    const leaveType = await LeaveType.findById(id).lean();
    if (!leaveType) return Response.json({ message: 'Leave type not found' }, { status: 404 });
    if (leaveType.status !== 'active' && !access.canViewAll) {
      throw new ApiError(403, 'This leave type is inactive');
    }

    return Response.json({ leaveType, access }, { status: 200 });
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Leave type not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching leave type');
  }
}

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

    const body = await parseJsonBody(request);
    const has = (field) => Object.prototype.hasOwnProperty.call(body, field);

    if (has('name')) {
      const name = String(body.name || '').trim();
      if (!name) throw new ApiError(400, 'Leave type name is required');
      if (name.length > 80) throw new ApiError(400, 'Leave type name cannot exceed 80 characters');
      const duplicate = await LeaveType.findOne({
        _id: { $ne: leaveType._id },
        name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
      });
      if (duplicate) throw new ApiError(409, 'A leave type with this name already exists');
      leaveType.name = name;
    }

    if (has('code')) {
      const code = String(body.code || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_');
      if (code && !CODE_RE.test(code)) {
        throw new ApiError(400, 'Code may only contain letters, numbers, hyphens and underscores');
      }
      if (code) {
        const duplicateCode = await LeaveType.findOne({
          _id: { $ne: leaveType._id },
          code,
        });
        if (duplicateCode) throw new ApiError(409, 'A leave type with this code already exists');
      }
      leaveType.code = code || undefined;
    }

    if (has('description')) leaveType.description = body.description ? String(body.description).trim() : null;
    if (has('annualAllocation')) {
      leaveType.annualAllocation = numberValue(body.annualAllocation, 0, 'Annual allocation');
    }
    if (has('isPaid')) leaveType.isPaid = boolValue(body.isPaid, true);
    if (has('requiresApproval')) {
      leaveType.requiresApproval = boolValue(body.requiresApproval, true);
    }
    if (has('allowHalfDay')) leaveType.allowHalfDay = boolValue(body.allowHalfDay, true);
    if (has('includeWeekends')) leaveType.includeWeekends = boolValue(body.includeWeekends, false);
    if (has('minNoticeDays')) {
      leaveType.minNoticeDays = numberValue(body.minNoticeDays, 0, 'Minimum notice');
    }
    if (has('maxConsecutiveDays')) {
      leaveType.maxConsecutiveDays = numberValue(body.maxConsecutiveDays, 0, 'Maximum consecutive days');
    }
    if (has('color')) {
      const color = String(body.color || '').trim();
      if (!HEX_COLOR.test(color)) throw new ApiError(400, 'Color must be a valid hex value');
      leaveType.color = color;
    }
    if (has('status')) {
      if (!['active', 'inactive'].includes(body.status)) {
        throw new ApiError(400, 'Status must be active or inactive');
      }
      leaveType.status = body.status;
    }

    await leaveType.save();

    return Response.json(
      { message: 'Leave type updated successfully', leaveType },
      { status: 200 }
    );
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Leave type not found' }, { status: 404 });
    }
    if (error?.code === 11000) {
      return Response.json({ message: 'A leave type with this name or code already exists' }, { status: 409 });
    }
    return handleApiError(error, 'Server error updating leave type');
  }
}

export async function DELETE(request, { params }) {
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

    const [usageCount, balanceCount] = await Promise.all([
      Leave.countDocuments({ leaveType: id }),
      LeaveBalance.countDocuments({ leaveType: id }),
    ]);

    if (usageCount > 0 || balanceCount > 0) {
      return Response.json(
        {
          message:
            'This leave type is already in use by leave requests or employee balances. Deactivate it instead of deleting.',
        },
        { status: 409 }
      );
    }

    await leaveType.deleteOne();

    return Response.json({ message: 'Leave type deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Leave type not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting leave type');
  }
}
