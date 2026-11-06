import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import EmployeeSalary from '@/lib/models/EmployeeSalary';
import PayrollEntry from '@/lib/models/PayrollEntry';
import PayrollRun from '@/lib/models/PayrollRun';
import Attendance from '@/lib/models/Attendance';
import Payslip from '@/lib/models/Payslip';
import { handleApiError } from '@/lib/auth';
import { getPayrollAccess } from '@/lib/payroll/access';

export async function GET(request, { params }) {
  try {
    const access = await getPayrollAccess(request);
    if (!access.canViewEmployeeSalaries) {
      return Response.json(
        { message: 'You do not have permission to view payroll calculations' },
        { status: 403 }
      );
    }
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Employee salary not found' }, { status: 404 });
    }

    const salary = await EmployeeSalary.findById(id)
      .populate('employee', 'name employee_id email base_salary profile_image branch_id department_id designation_id employee_status')
      .populate('components', 'name type calculationType defaultAmount percentageOfBasic status')
      .lean();
    if (!salary) {
      return Response.json({ message: 'Employee salary not found' }, { status: 404 });
    }

    const employeeId = salary.employee?._id;
    const runIds = await PayrollEntry.distinct('payrollRun', { employee: employeeId });
    const payrollRuns = await PayrollRun.find({ _id: { $in: runIds } })
      .select('title payPeriodStart payPeriodEnd payDate status payrollFrequency')
      .sort({ payPeriodEnd: -1 })
      .lean();

    const requestedRunId = request.nextUrl.searchParams.get('payroll_run_id');
    const selectedRun =
      payrollRuns.find((run) => String(run._id) === String(requestedRunId)) ||
      payrollRuns[0] ||
      null;

    let payrollEntry = null;
    let attendanceRecords = [];
    let payslip = null;

    if (selectedRun) {
      payrollEntry = await PayrollEntry.findOne({
        payrollRun: selectedRun._id,
        employee: employeeId,
      }).lean();

      attendanceRecords = await Attendance.find({
        employee: employeeId,
        date: { $gte: selectedRun.payPeriodStart, $lte: selectedRun.payPeriodEnd },
      })
        .select('date status checkIn checkOut workHours overtimeHours overtimeAmount')
        .sort({ date: 1 })
        .lean();

      payslip = await Payslip.findOne({ payrollEntry: payrollEntry?._id })
        .select('payslipNumber status payDate')
        .lean();
    }

    const attendanceSummary = payrollEntry
      ? {
          totalWorkingDays: payrollEntry.workingDays,
          presentDays: payrollEntry.presentDays,
          fullPresentDays: payrollEntry.fullPresentDays,
          absentDays: payrollEntry.absentDays,
          halfDays: payrollEntry.halfDays,
          holidayDays: payrollEntry.holidayDays,
          paidLeaveDays: payrollEntry.paidLeaveDays,
          unpaidLeaveDays: payrollEntry.unpaidLeaveDays,
          lopDays: payrollEntry.lopDays,
          effectivePaidDays: payrollEntry.effectivePaidDays,
          overtimeHours: payrollEntry.overtimeHours,
          overtimeAmount: payrollEntry.overtimeAmount,
        }
      : null;

    const payrollCalculation = payrollEntry
      ? {
          basicSalary: payrollEntry.basicSalary,
          componentEarnings: payrollEntry.componentEarnings,
          totalEarnings: payrollEntry.totalEarnings,
          grossPay: payrollEntry.grossPay,
          totalDeductions: payrollEntry.totalDeductions,
          netPay: payrollEntry.netPay,
          perDaySalary: payrollEntry.perDaySalary,
          lopDeduction: payrollEntry.lopDeduction,
          unpaidLeaveDeduction: payrollEntry.unpaidLeaveDeduction,
          overtimeAmount: payrollEntry.overtimeAmount,
        }
      : null;

    return Response.json({
      salary,
      payrollRuns,
      selectedPayrollRun: selectedRun,
      payrollEntry,
      payslip,
      attendanceSummary,
      payrollCalculation,
      salaryBreakdown: payrollEntry
        ? {
            earnings: payrollEntry.earningsBreakdown || [],
            deductions: payrollEntry.deductionsBreakdown || [],
          }
        : { earnings: [], deductions: [] },
      attendanceRecords,
      access,
    });
  } catch (error) {
    return handleApiError(error, 'Server error loading payroll calculation');
  }
}
