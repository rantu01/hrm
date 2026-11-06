import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Payslip from '@/lib/models/Payslip';
import PayrollEntry from '@/lib/models/PayrollEntry';
import PayrollRun from '@/lib/models/PayrollRun';
import { handleApiError } from '@/lib/auth';
import { requirePayrollPermission } from '@/lib/payroll/access';
import { createPayslipForEntry } from '@/lib/payroll/payslips';
import { parseJsonBody } from '@/lib/validation';

export async function POST(request) {
  try {
    const user = await requirePayrollPermission(request, 'generatePayslips');
    await connectDB();
    const body = await parseJsonBody(request);

    const runId = body.payrollRunId || body.payroll_run_id;
    const rawEntryIds = Array.isArray(body.payrollEntryIds)
      ? body.payrollEntryIds
      : Array.isArray(body.payroll_entry_ids)
        ? body.payroll_entry_ids
        : [];

    let run = null;
    let entries = [];

    if (runId) {
      if (!mongoose.Types.ObjectId.isValid(runId)) {
        return Response.json({ message: 'Payroll run is invalid' }, { status: 400 });
      }
      run = await PayrollRun.findById(runId).lean();
      if (!run) {
        return Response.json({ message: 'Payroll run not found' }, { status: 404 });
      }
      if (run.status !== 'completed') {
        return Response.json(
          { message: 'Payslips can only be generated for a completed payroll run.' },
          { status: 409 }
        );
      }
      entries = await PayrollEntry.find({ payrollRun: run._id })
        .populate('employee', 'name employee_id email')
        .lean();
    } else if (rawEntryIds.length > 0) {
      const entryIds = rawEntryIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      entries = await PayrollEntry.find({ _id: { $in: entryIds } })
        .populate('employee', 'name employee_id email')
        .lean();
      if (entries.length === 0) {
        return Response.json(
          { message: 'No valid payroll entries were found' },
          { status: 404 }
        );
      }
    } else {
      return Response.json(
        { message: 'Select a payroll run or payroll entries first' },
        { status: 400 }
      );
    }

    const existing = await Payslip.find({
      payrollEntry: { $in: entries.map((entry) => entry._id) },
    })
      .select('payrollEntry')
      .lean();
    const existingSet = new Set(existing.map((payslip) => String(payslip.payrollEntry)));

    const runCache = new Map();
    if (run) runCache.set(String(run._id), run);

    const created = [];
    let skipped = 0;

    for (const entry of entries) {
      if (existingSet.has(String(entry._id))) {
        skipped += 1;
        continue;
      }
      let entryRun = runCache.get(String(entry.payrollRun));
      if (!entryRun) {
        entryRun = await PayrollRun.findById(entry.payrollRun).lean();
        if (entryRun) runCache.set(String(entryRun._id), entryRun);
      }
      if (!entryRun) {
        skipped += 1;
        continue;
      }
      if (entryRun.status !== 'completed') {
        skipped += 1;
        continue;
      }
      const result = await createPayslipForEntry({
        entry,
        run: entryRun,
        employee: entry.employee,
        userId: user._id,
      });
      if (result.created) created.push(result.payslip);
      else skipped += 1;
    }

    return Response.json({
      message:
        created.length > 0
          ? `${created.length} payslip(s) generated successfully${
              skipped > 0 ? `, ${skipped} already existed` : ''
            }`
          : 'No new payslips were generated. They may already exist for this run.',
      created: created.length,
      skipped,
      payslips: created,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json(
        { message: 'One or more payslips already exist for this payroll run.' },
        { status: 409 }
      );
    }
    return handleApiError(error, 'Server error generating payslips');
  }
}
