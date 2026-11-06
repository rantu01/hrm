import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import PayrollEntry from '@/lib/models/PayrollEntry';
import PayrollRun from '@/lib/models/PayrollRun';
import Payslip from '@/lib/models/Payslip';
import { handleApiError } from '@/lib/auth';
import { requirePayrollPermission } from '@/lib/payroll/access';
import { round2 } from '@/lib/payroll/calculate';

export async function DELETE(request, { params }) {
  try {
    await requirePayrollPermission(request, 'deleteRuns');
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Payroll entry not found' }, { status: 404 });
    }

    const entry = await PayrollEntry.findById(id);
    if (!entry) {
      return Response.json({ message: 'Payroll entry not found' }, { status: 404 });
    }

    const run = await PayrollRun.findById(entry.payrollRun);
    if (!run) {
      return Response.json({ message: 'Payroll run not found' }, { status: 404 });
    }

    await Payslip.deleteMany({ payrollEntry: entry._id });
    await entry.deleteOne();

    const totals = await PayrollEntry.aggregate([
      { $match: { payrollRun: run._id } },
      {
        $group: {
          _id: null,
          grossPay: { $sum: '$grossPay' },
          deductions: { $sum: '$totalDeductions' },
          netPay: { $sum: '$netPay' },
          count: { $sum: 1 },
        },
      },
    ]);
    const summary = totals[0] || {
      grossPay: 0,
      deductions: 0,
      netPay: 0,
      count: 0,
    };

    // Removing an entry invalidates the finalised totals, so the run returns to
    // draft and can be processed again.
    run.totalGrossPay = round2(summary.grossPay);
    run.totalDeductions = round2(summary.deductions);
    run.totalNetPay = round2(summary.netPay);
    run.employeeCount = summary.count;
    run.status = 'draft';
    run.completedAt = null;
    run.processedAt = null;
    await run.save();

    return Response.json({ message: 'Payroll entry deleted successfully', run });
  } catch (error) {
    return handleApiError(error, 'Server error deleting payroll entry');
  }
}
