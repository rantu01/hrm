import connectDB from '@/lib/db';
import LeaveType from '@/lib/models/LeaveType';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';
import { getLeaveAccess } from '@/lib/leave-server';

const DEFAULT_TYPES = [
  {
    name: 'Annual Leave',
    code: 'ANNUAL',
    description: 'Paid yearly vacation entitlement.',
    annualAllocation: 20,
    isPaid: true,
    requiresApproval: true,
    allowHalfDay: true,
    includeWeekends: false,
    minNoticeDays: 3,
    maxConsecutiveDays: 0,
    color: '#FFEB00',
  },
  {
    name: 'Sick Leave',
    code: 'SICK',
    description: 'Paid leave for illness or medical appointments.',
    annualAllocation: 10,
    isPaid: true,
    requiresApproval: true,
    allowHalfDay: true,
    includeWeekends: false,
    minNoticeDays: 0,
    maxConsecutiveDays: 0,
    color: '#E60023',
  },
  {
    name: 'Casual Leave',
    code: 'CASUAL',
    description: 'Short-notice paid leave for personal matters.',
    annualAllocation: 7,
    isPaid: true,
    requiresApproval: true,
    allowHalfDay: true,
    includeWeekends: false,
    minNoticeDays: 0,
    maxConsecutiveDays: 0,
    color: '#1C2925',
  },
  {
    name: 'Maternity Leave',
    code: 'MATERNITY',
    description: 'Paid maternity leave entitlement.',
    annualAllocation: 90,
    isPaid: true,
    requiresApproval: true,
    allowHalfDay: false,
    includeWeekends: true,
    minNoticeDays: 0,
    maxConsecutiveDays: 90,
    color: '#7C3AED',
  },
  {
    name: 'Paternity Leave',
    code: 'PATERNITY',
    description: 'Paid paternity leave entitlement.',
    annualAllocation: 10,
    isPaid: true,
    requiresApproval: true,
    allowHalfDay: false,
    includeWeekends: true,
    minNoticeDays: 0,
    maxConsecutiveDays: 10,
    color: '#2563EB',
  },
  {
    name: 'Unpaid Leave',
    code: 'UNPAID',
    description: 'Leave without pay for extended absence.',
    annualAllocation: 0,
    isPaid: false,
    requiresApproval: true,
    allowHalfDay: true,
    includeWeekends: false,
    minNoticeDays: 7,
    maxConsecutiveDays: 0,
    color: '#6B7280',
  },
];

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    if (!access.canManageTypes) {
      throw new ApiError(403, 'You do not have permission to manage leave types');
    }

    const existing = await LeaveType.find({}).select('name code').lean();
    const existingNames = new Set(existing.map((type) => String(type.name).toLowerCase()));
    const existingCodes = new Set(existing.map((type) => String(type.code || '').toUpperCase()));

    const created = [];
    const skipped = [];

    for (const type of DEFAULT_TYPES) {
      if (existingNames.has(type.name.toLowerCase()) || existingCodes.has(type.code)) {
        skipped.push(type.name);
        continue;
      }
      const leaveType = await LeaveType.create({ ...type, status: 'active', isSystem: true });
      created.push({ _id: leaveType._id, name: leaveType.name, code: leaveType.code });
    }

    return Response.json(
      {
        message:
          created.length > 0
            ? `${created.length} default leave type(s) created`
            : 'All default leave types already exist',
        created,
        skipped,
      },
      { status: created.length > 0 ? 201 : 200 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json({ message: 'A default leave type already exists' }, { status: 409 });
    }
    return handleApiError(error, 'Server error creating default leave types');
  }
}
