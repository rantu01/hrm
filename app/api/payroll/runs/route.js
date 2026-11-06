import connectDB from '@/lib/db';
import PayrollRun from '@/lib/models/PayrollRun';
import { handleApiError } from '@/lib/auth';
import {
  getPayrollAccess,
  requirePayrollPermission,
} from '@/lib/payroll/access';
import {
  buildMonths,
  endOfMonthUtc,
  monthLabel,
  parsePeriodDate,
  startOfMonthUtc,
} from '@/lib/payroll/periods';
import { parseJsonBody } from '@/lib/validation';

const FREQUENCIES = ['weekly', 'biweekly', 'monthly'];
const SORTABLE = {
  title: 'title',
  pay_date: 'payDate',
  payDate: 'payDate',
  pay_period_start: 'payPeriodStart',
  payPeriodStart: 'payPeriodStart',
  total_net_pay: 'totalNetPay',
  totalNetPay: 'totalNetPay',
  employee_count: 'employeeCount',
  employeeCount: 'employeeCount',
  created_at: 'createdAt',
  createdAt: 'createdAt',
};

export async function GET(request) {
  try {
    const access = await getPayrollAccess(request);
    if (!access.canViewRuns) {
      return Response.json(
        { message: 'You do not have permission to view payroll runs' },
        { status: 403 }
      );
    }
    await connectDB();

    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page'), 10) || 1);
    const perPage = Math.max(
      1,
      parseInt(sp.get('per_page'), 10) || parseInt(sp.get('limit'), 10) || 10
    );
    const skip = (page - 1) * perPage;

    const selectedDate = parsePeriodDate(sp.get('selected_date'));
    const monthStart = startOfMonthUtc(selectedDate);
    const monthEnd = endOfMonthUtc(selectedDate);

    const and = [];
    const search = (sp.get('search') || '').trim();
    if (search) {
      and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } },
        ],
      });
    }

    const dateFrom = sp.get('date_from');
    const dateTo = sp.get('date_to');
    if (dateFrom || dateTo) {
      if (dateFrom) and.push({ payPeriodStart: { $gte: parsePeriodDate(dateFrom) } });
      if (dateTo) and.push({ payPeriodEnd: { $lte: parsePeriodDate(dateTo) } });
    } else {
      and.push({ payPeriodStart: { $lte: monthEnd } });
      and.push({ payPeriodEnd: { $gte: monthStart } });
    }

    const baseFilter = and.length > 0 ? { $and: and } : {};

    const status = sp.get('status');
    const statusFilter =
      status && status !== 'all' && status !== '_empty_'
        ? { ...baseFilter, status }
        : baseFilter;

    const sortField = SORTABLE[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const [runs, total, draft, processing, completed, cancelled, all] =
      await Promise.all([
        PayrollRun.find(statusFilter)
          .populate('createdBy', 'name')
          .sort({ [sortField]: sortDirection })
          .skip(skip)
          .limit(perPage)
          .lean(),
        PayrollRun.countDocuments(statusFilter),
        PayrollRun.countDocuments({ ...baseFilter, status: 'draft' }),
        PayrollRun.countDocuments({ ...baseFilter, status: 'processing' }),
        PayrollRun.countDocuments({ ...baseFilter, status: 'completed' }),
        PayrollRun.countDocuments({ ...baseFilter, status: 'cancelled' }),
        PayrollRun.countDocuments(baseFilter),
      ]);

    return Response.json({
      runs,
      pagination: {
        page,
        limit: perPage,
        total,
        pages: Math.ceil(total / perPage) || 1,
      },
      statusCounts: {
        all,
        draft,
        processing,
        completed,
        cancelled,
      },
      monthLabel: monthLabel(selectedDate),
      selectedDate: monthStart.toISOString().slice(0, 10),
      months: buildMonths(monthStart.getUTCFullYear()),
      access,
    });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    return handleApiError(error, 'Server error fetching payroll runs');
  }
}

export async function POST(request) {
  try {
    const user = await requirePayrollPermission(request, 'createRuns');
    await connectDB();
    const body = await parseJsonBody(request);

    const title = String(body.title || '').trim();
    const payrollFrequency = String(body.payrollFrequency || 'monthly');
    const start = parsePeriodDate(body.payPeriodStart, null);
    const end = parsePeriodDate(body.payPeriodEnd, null);
    const payDate = parsePeriodDate(body.payDate, null);

    if (!title) {
      return Response.json({ message: 'Payroll run title is required' }, { status: 400 });
    }
    if (!FREQUENCIES.includes(payrollFrequency)) {
      return Response.json({ message: 'Payroll frequency is invalid' }, { status: 400 });
    }
    if (!start || !end || !payDate) {
      return Response.json({ message: 'Pay period and pay date are required' }, { status: 400 });
    }
    if (end <= start) {
      return Response.json(
        { message: 'Pay period end must be after the pay period start' },
        { status: 400 }
      );
    }
    if (payDate < end) {
      return Response.json(
        { message: 'Pay date must be on or after the pay period end' },
        { status: 400 }
      );
    }

    const exists = await PayrollRun.findOne({
      payPeriodStart: start,
      payPeriodEnd: end,
    }).select('_id title');
    if (exists) {
      return Response.json(
        {
          message: `A payroll run already exists for this pay period (${exists.title}).`,
        },
        { status: 409 }
      );
    }

    const run = await PayrollRun.create({
      title,
      payrollFrequency,
      payPeriodStart: start,
      payPeriodEnd: end,
      payDate,
      notes: body.notes ? String(body.notes).trim() : null,
      status: 'draft',
      createdBy: user._id,
    });

    return Response.json(
      { message: 'Payroll run created successfully', run },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json(
        { message: 'A payroll run already exists for this pay period.' },
        { status: 409 }
      );
    }
    return handleApiError(error, 'Server error creating payroll run');
  }
}
