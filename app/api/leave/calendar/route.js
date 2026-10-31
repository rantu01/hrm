import connectDB from '@/lib/db';
import Holiday from '@/lib/models/Holiday';
import Leave from '@/lib/models/Leave';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';
import {
  getLeaveAccess,
  isValidObjectId,
  populateLeave,
} from '@/lib/leave-server';
import { toUtcDate } from '@/lib/leave-utils';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    const sp = request.nextUrl.searchParams;

    const now = new Date();
    const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

    const from = toUtcDate(sp.get('from')) || defaultFrom;
    let to = toUtcDate(sp.get('to')) || defaultTo;
    if (to.getTime() < from.getTime()) {
      throw new ApiError(400, 'The calendar range end must be after its start');
    }
    to = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1);

    const and = [
      { startDate: { $lte: to } },
      { endDate: { $gte: from } },
    ];

    if (!access.canViewAll) {
      and.push({ employee: access.employee?._id || { $in: [] } });
    } else if (sp.get('employee')) {
      if (!isValidObjectId(sp.get('employee'))) throw new ApiError(400, 'Invalid employee filter');
      and.push({ employee: sp.get('employee') });
    }

    if (sp.get('leave_type')) {
      if (!isValidObjectId(sp.get('leave_type'))) throw new ApiError(400, 'Invalid leave type filter');
      and.push({ leaveType: sp.get('leave_type') });
    }

    const statusParam = sp.get('status');
    if (statusParam && statusParam !== 'all') {
      const statuses = statusParam
        .split(',')
        .map((status) => status.trim())
        .filter((status) => ['pending', 'approved', 'rejected', 'cancelled'].includes(status));
      and.push({ status: { $in: statuses.length > 0 ? statuses : ['approved', 'pending'] } });
    } else if (!statusParam) {
      and.push({ status: { $in: ['approved', 'pending'] } });
    }

    const [leaves, holidays] = await Promise.all([
      populateLeave(Leave.find({ $and: and }).sort({ startDate: 1, createdAt: 1 })),
      Holiday.find({
        $or: [
          { is_recurring: true },
          {
            $and: [
              { start_date: { $lte: to } },
              {
                $or: [
                  { end_date: { $gte: from } },
                  { end_date: null, start_date: { $gte: from } },
                  { end_date: { $exists: false }, start_date: { $gte: from } },
                ],
              },
            ],
          },
        ],
      })
        .sort({ start_date: 1 })
        .lean(),
    ]);

    return Response.json(
      {
        leaves,
        holidays,
        range: { from: from.toISOString(), to: to.toISOString() },
        access,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching leave calendar');
  }
}
