import connectDB from '@/lib/db';
import LeaveType from '@/lib/models/LeaveType';
import Leave from '@/lib/models/Leave';
import LeaveBalance from '@/lib/models/LeaveBalance';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validation';
import { getLeaveAccess, parsePagination } from '@/lib/leave-server';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const CODE_RE = /^[A-Z0-9_-]+$/;

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function boolValue(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === 1 || value === '1';
}

function numberValue(value, fallback, { min = 0, max = 365 } = {}) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new ApiError(400, `Value must be a number between ${min} and ${max}`);
  }
  return parsed;
}

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    const sp = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(sp, 50);

    const requestedStatus = sp.get('status');
    const includeInactive =
      sp.get('include_inactive') === 'true' || sp.get('include_inactive') === '1';

    const filter = {};
    if (access.canManageTypes || access.canViewAll) {
      if (requestedStatus && requestedStatus !== 'all') filter.status = requestedStatus;
      else if (!includeInactive) filter.status = 'active';
    } else {
      filter.status = 'active';
    }

    const search = (sp.get('search') || '').trim();
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sortMap = {
      name: 'name',
      code: 'code',
      annualAllocation: 'annualAllocation',
      created_at: 'createdAt',
      createdAt: 'createdAt',
    };
    const sortField = sortMap[sp.get('sort_field')] || 'name';
    const sortDirection = sp.get('sort_direction') === 'desc' ? -1 : 1;

    const baseFilter = search ? { $or: filter.$or } : {};
    const [leaveTypes, total, all, active, inactive, usage, balanceUsage] = await Promise.all([
      LeaveType.find(filter).sort({ [sortField]: sortDirection }).skip(skip).limit(limit).lean(),
      LeaveType.countDocuments(filter),
      LeaveType.countDocuments(baseFilter),
      LeaveType.countDocuments({ ...baseFilter, status: 'active' }),
      LeaveType.countDocuments({ ...baseFilter, status: 'inactive' }),
      Leave.aggregate([{ $group: { _id: '$leaveType', count: { $sum: 1 } } }]),
      LeaveBalance.aggregate([{ $group: { _id: '$leaveType', count: { $sum: 1 } } }]),
    ]);

    const usageCounts = Object.fromEntries(
      usage.filter((row) => row._id).map((row) => [String(row._id), row.count])
    );
    const balanceCounts = Object.fromEntries(
      balanceUsage.filter((row) => row._id).map((row) => [String(row._id), row.count])
    );

    const rows = leaveTypes.map((type) => ({
      ...type,
      usageCount: usageCounts[String(type._id)] || 0,
      balanceCount: balanceCounts[String(type._id)] || 0,
    }));

    return Response.json(
      {
        leaveTypes: rows,
        statusCounts: { all, active, inactive },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        access,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching leave types');
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    if (!access.canManageTypes) {
      throw new ApiError(403, 'You do not have permission to manage leave types');
    }

    const body = await parseJsonBody(request);
    const name = String(body.name || '').trim();
    if (!name) throw new ApiError(400, 'Leave type name is required');
    if (name.length > 80) throw new ApiError(400, 'Leave type name cannot exceed 80 characters');

    let code = String(body.code || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
    if (code && !CODE_RE.test(code)) {
      throw new ApiError(400, 'Code may only contain letters, numbers, hyphens and underscores');
    }

    const duplicate = await LeaveType.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
    });
    if (duplicate) throw new ApiError(409, 'A leave type with this name already exists');
    if (code) {
      const duplicateCode = await LeaveType.findOne({ code });
      if (duplicateCode) throw new ApiError(409, 'A leave type with this code already exists');
    }

    const color = String(body.color || '#E60023').trim();
    if (!HEX_COLOR.test(color)) throw new ApiError(400, 'Color must be a valid hex value');

    const leaveType = await LeaveType.create({
      name,
      code: code || undefined,
      description: body.description ? String(body.description).trim() : null,
      annualAllocation: numberValue(body.annualAllocation, 0),
      isPaid: boolValue(body.isPaid, true),
      requiresApproval: boolValue(body.requiresApproval, true),
      allowHalfDay: boolValue(body.allowHalfDay, true),
      includeWeekends: boolValue(body.includeWeekends, false),
      minNoticeDays: numberValue(body.minNoticeDays, 0),
      maxConsecutiveDays: numberValue(body.maxConsecutiveDays, 0),
      color,
      status: body.status === 'inactive' ? 'inactive' : 'active',
    });

    return Response.json(
      { message: 'Leave type created successfully', leaveType },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json({ message: 'A leave type with this name or code already exists' }, { status: 409 });
    }
    return handleApiError(error, 'Server error creating leave type');
  }
}
