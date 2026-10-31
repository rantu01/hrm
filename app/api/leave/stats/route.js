import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import Leave from '@/lib/models/Leave';
import LeaveType from '@/lib/models/LeaveType';
import LeaveBalance from '@/lib/models/LeaveBalance';
import { requireAuth, handleApiError } from '@/lib/auth';
import { getLeaveAccess, getYearRange, populateLeave } from '@/lib/leave-server';
import { roundDays, toUtcDate } from '@/lib/leave-utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function baseScope(access) {
  if (access.canViewAll) return {};
  if (access.employee) return { employee: access.employee._id };
  return { _id: { $in: [] } };
}

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);

    const sp = request.nextUrl.searchParams;
    const year = parseInt(sp.get('year'), 10) || new Date().getUTCFullYear();
    const { start, end } = getYearRange(year);
    const scope = baseScope(access);

    const today = toUtcDate(new Date());
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const yearFilter = { ...scope, startDate: { $gte: start, $lt: end } };

    const [
      statusRows,
      pendingDayRows,
      approvedDayRows,
      onLeaveToday,
      upcomingWeek,
      activeLeaveTypes,
      activeEmployees,
      byTypeRows,
      monthlyRows,
      recentPending,
      upcomingLeaves,
      myBalances,
    ] = await Promise.all([
      Leave.aggregate([
        { $match: yearFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Leave.aggregate([
        { $match: { ...yearFilter, status: 'pending' } },
        { $group: { _id: null, days: { $sum: '$totalDays' } } },
      ]),
      Leave.aggregate([
        { $match: { ...yearFilter, status: 'approved' } },
        { $group: { _id: null, days: { $sum: '$totalDays' } } },
      ]),
      Leave.countDocuments({
        ...scope,
        status: 'approved',
        startDate: { $lte: today },
        endDate: { $gte: today },
      }),
      Leave.countDocuments({
        ...scope,
        status: 'approved',
        startDate: { $gte: today, $lte: nextWeek },
      }),
      LeaveType.countDocuments({ status: 'active' }),
      Employee.countDocuments({ employee_status: { $in: ['active', 'probation'] } }),
      Leave.aggregate([
        { $match: { ...yearFilter, status: 'approved' } },
        {
          $group: {
            _id: '$leaveType',
            requests: { $sum: 1 },
            days: { $sum: '$totalDays' },
          },
        },
        { $sort: { days: -1 } },
      ]),
      Leave.aggregate([
        { $match: yearFilter },
        {
          $group: {
            _id: { month: { $month: '$startDate' }, status: '$status' },
            requests: { $sum: 1 },
            days: { $sum: '$totalDays' },
          },
        },
      ]),
      populateLeave(
        Leave.find({ ...scope, status: 'pending' }).sort({ createdAt: -1 }).limit(5)
      ),
      populateLeave(
        Leave.find({ ...scope, status: 'approved', startDate: { $gte: today } })
          .sort({ startDate: 1 })
          .limit(5)
      ),
      access.employee
        ? LeaveBalance.find({ employee: access.employee._id, year })
            .populate('leaveType', 'name code color isPaid')
            .sort({ createdAt: 1 })
            .lean()
        : Promise.resolve([]),
    ]);

    const counts = { all: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    for (const row of statusRows) {
      if (row._id && row._id in counts) counts[row._id] = row.count;
      counts.all += row.count;
    }

    const typeIds = byTypeRows.map((row) => row._id).filter(Boolean);
    const types = await LeaveType.find({ _id: { $in: typeIds } })
      .select('name code color')
      .lean();
    const typeMap = new Map(types.map((type) => [String(type._id), type]));

    const byType = byTypeRows.map((row) => {
      const type = row._id ? typeMap.get(String(row._id)) : null;
      return {
        leaveTypeId: row._id ? String(row._id) : null,
        name: type?.name || 'Other',
        code: type?.code || 'OTHER',
        color: type?.color || '#6B7280',
        requests: row.requests || 0,
        days: roundDays(row.days),
      };
    });

    const monthlyMap = new Map();
    for (let i = 1; i <= 12; i += 1) {
      monthlyMap.set(i, {
        month: MONTHS[i - 1],
        approved: 0,
        pending: 0,
        rejected: 0,
        cancelled: 0,
        approvedDays: 0,
        pendingDays: 0,
      });
    }
    for (const row of monthlyRows) {
      const bucket = monthlyMap.get(row._id.month);
      if (!bucket) continue;
      if (row._id.status in bucket) bucket[row._id.status] = row.requests;
      if (row._id.status === 'approved') bucket.approvedDays = roundDays(row.days);
      if (row._id.status === 'pending') bucket.pendingDays = roundDays(row.days);
    }

    return Response.json(
      {
        year,
        scope: access.canViewAll ? 'all' : 'self',
        stats: {
          ...counts,
          pendingDays: roundDays(pendingDayRows[0]?.days || 0),
          approvedDays: roundDays(approvedDayRows[0]?.days || 0),
          onLeaveToday,
          upcomingWeek,
          activeLeaveTypes,
          activeEmployees,
          byType,
          monthly: Array.from(monthlyMap.values()),
          recentPending,
          upcomingLeaves,
          myBalances: myBalances.map((balance) => ({
            ...balance,
            available: roundDays(
              (Number(balance.allocated) || 0) +
                (Number(balance.carryForward) || 0) +
                (Number(balance.adjustment) || 0) -
                (Number(balance.used) || 0) -
                (Number(balance.pending) || 0)
            ),
          })),
        },
        access,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching leave dashboard');
  }
}
