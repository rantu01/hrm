import connectDB from '@/lib/db';
import PayrollRun from '@/lib/models/PayrollRun';
import PayrollEntry from '@/lib/models/PayrollEntry';
import Payslip from '@/lib/models/Payslip';
import Employee from '@/lib/models/Employee';
import { handleApiError } from '@/lib/auth';
import { getPayrollAccess } from '@/lib/payroll/access';
import { endOfMonthUtc, startOfMonthUtc } from '@/lib/payroll/periods';
import { round2 } from '@/lib/payroll/calculate';

export async function GET(request) {
  try {
    const access = await getPayrollAccess(request);
    if (!access.canViewRuns) {
      return Response.json(
        { message: 'You do not have permission to view the payroll dashboard' },
        { status: 403 }
      );
    }
    await connectDB();

    const now = new Date();
    const monthStart = startOfMonthUtc(now);
    const monthEnd = endOfMonthUtc(now);

    const [activeEmployees, totalRuns, draftRuns, processingRuns, completedRuns, cancelledRuns, monthlyRuns, payslipsGenerated, payslipsDownloaded, recentRuns] =
      await Promise.all([
        Employee.countDocuments({ employee_status: { $in: ['active', 'probation'] } }),
        PayrollRun.countDocuments({}),
        PayrollRun.countDocuments({ status: 'draft' }),
        PayrollRun.countDocuments({ status: 'processing' }),
        PayrollRun.countDocuments({ status: 'completed' }),
        PayrollRun.countDocuments({ status: 'cancelled' }),
        PayrollRun.find({
          status: 'completed',
          payDate: { $gte: monthStart, $lte: monthEnd },
        })
          .select('totalGrossPay totalDeductions totalNetPay employeeCount')
          .lean(),
        Payslip.countDocuments({}),
        Payslip.countDocuments({ status: 'downloaded' }),
        PayrollRun.find({})
          .populate('createdBy', 'name')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

    const monthlyTotals = monthlyRuns.reduce(
      (totals, run) => ({
        gross: totals.gross + (Number(run.totalGrossPay) || 0),
        deductions: totals.deductions + (Number(run.totalDeductions) || 0),
        net: totals.net + (Number(run.totalNetPay) || 0),
        employees: Math.max(totals.employees, Number(run.employeeCount) || 0),
      }),
      { gross: 0, deductions: 0, net: 0, employees: 0 }
    );

    return Response.json({
      stats: {
        activeEmployees,
        totalRuns,
        draftRuns,
        processingRuns,
        completedRuns,
        cancelledRuns,
        monthlyGross: round2(monthlyTotals.gross),
        monthlyDeductions: round2(monthlyTotals.deductions),
        monthlyNet: round2(monthlyTotals.net),
        monthlyEmployees: monthlyTotals.employees,
        payslipsGenerated,
        payslipsDownloaded,
      },
      recentRuns,
      access,
    });
  } catch (error) {
    return handleApiError(error, 'Server error fetching payroll dashboard');
  }
}
