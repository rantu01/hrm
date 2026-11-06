import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Payslip from '@/lib/models/Payslip';
import Employee from '@/lib/models/Employee';
import { handleApiError } from '@/lib/auth';
import { getPayrollAccess } from '@/lib/payroll/access';
import {
  buildMonths,
  endOfMonthUtc,
  monthLabel,
  parsePeriodDate,
  startOfMonthUtc,
} from '@/lib/payroll/periods';

const STATUSES = ['generated', 'sent', 'downloaded'];

export async function GET(request) {
  try {
    const access = await getPayrollAccess(request);
    const manager = access.canViewAllPayslips;
    const linkedEmployee = access.linkedEmployee;

    if (!manager && !linkedEmployee) {
      return Response.json(
        { message: 'You do not have permission to view payslips' },
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

    const selectedMonthRaw = sp.get('selected_month');
    const showAllMonths = selectedMonthRaw === 'all';
    const selectedDate = parsePeriodDate(
      selectedMonthRaw && !showAllMonths ? `${selectedMonthRaw}-01` : undefined
    );
    const monthStart = startOfMonthUtc(selectedDate);
    const monthEnd = endOfMonthUtc(selectedDate);

    const and = [];
    if (!manager) {
      and.push({ employee: linkedEmployee._id });
    }

    const search = (sp.get('search') || '').trim();
    if (search) {
      const matchedEmployees = await Employee.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { employee_id: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      })
        .select('_id')
        .lean();
      and.push({
        $or: [
          { payslipNumber: { $regex: search, $options: 'i' } },
          { employee: { $in: matchedEmployees.map((employee) => employee._id) } },
        ],
      });
    }

    const employeeFilter = sp.get('employee_id') || sp.get('employee');
    if (
      manager &&
      employeeFilter &&
      employeeFilter !== 'all' &&
      employeeFilter !== '_empty_'
    ) {
      if (!mongoose.Types.ObjectId.isValid(employeeFilter)) {
        return Response.json({ message: 'Employee filter is invalid' }, { status: 400 });
      }
      and.push({ employee: employeeFilter });
    }

    if (!showAllMonths && !sp.get('date_from') && !sp.get('date_to')) {
      and.push({ payDate: { $gte: monthStart, $lte: monthEnd } });
    } else {
      if (sp.get('date_from')) {
        and.push({ payDate: { $gte: parsePeriodDate(sp.get('date_from')) } });
      }
      if (sp.get('date_to')) {
        and.push({ payDate: { $lte: parsePeriodDate(sp.get('date_to')) } });
      }
    }

    const baseFilter = and.length > 0 ? { $and: and } : {};
    const status = sp.get('status');
    const statusFilter =
      status && status !== 'all' && STATUSES.includes(status)
        ? { ...baseFilter, status }
        : baseFilter;

    const sortField =
      sp.get('sort_field') === 'payslip_number'
        ? 'payslipNumber'
        : sp.get('sort_field') === 'net_pay'
          ? 'createdAt'
          : 'payDate';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const [payslips, total, generated, sent, downloaded, all] =
      await Promise.all([
        Payslip.find(statusFilter)
          .populate({
            path: 'payrollEntry',
            select:
              'basicSalary componentEarnings totalEarnings totalDeductions grossPay netPay workingDays presentDays fullPresentDays halfDays holidayDays paidLeaveDays unpaidLeaveDays absentDays lopDays lopDeduction effectivePaidDays overtimeHours overtimeAmount perDaySalary unpaidLeaveDeduction earningsBreakdown deductionsBreakdown payrollRun',
            populate: {
              path: 'payrollRun',
              select: 'title payrollFrequency payPeriodStart payPeriodEnd status',
            },
          })
          .populate(
            'employee',
            'name employee_id email profile_image department_id designation_id'
          )
          .sort({ [sortField]: sortDirection })
          .skip(skip)
          .limit(perPage)
          .lean(),
        Payslip.countDocuments(statusFilter),
        Payslip.countDocuments({ ...baseFilter, status: 'generated' }),
        Payslip.countDocuments({ ...baseFilter, status: 'sent' }),
        Payslip.countDocuments({ ...baseFilter, status: 'downloaded' }),
        Payslip.countDocuments(baseFilter),
      ]);

    let employees = [];
    if (manager) {
      employees = await Employee.find({
        employee_status: { $in: ['active', 'probation'] },
      })
        .select('name employee_id')
        .sort({ name: 1 })
        .lean();
    }

    return Response.json({
      payslips,
      pagination: {
        page,
        limit: perPage,
        total,
        pages: Math.ceil(total / perPage) || 1,
      },
      statusCounts: { all, generated, sent, downloaded },
      employees,
      monthLabel: showAllMonths ? 'All Months' : monthLabel(selectedDate),
      selectedMonth: showAllMonths ? 'all' : selectedMonthRaw || `${selectedDate.getUTCFullYear()}-${String(selectedDate.getUTCMonth() + 1).padStart(2, '0')}`,
      months: buildMonths(monthStart.getUTCFullYear()),
      access,
    });
  } catch (error) {
    return handleApiError(error, 'Server error fetching payslips');
  }
}
