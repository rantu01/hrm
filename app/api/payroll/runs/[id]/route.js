import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import PayrollRun from '@/lib/models/PayrollRun';
import PayrollEntry from '@/lib/models/PayrollEntry';
import Payslip from '@/lib/models/Payslip';
import { handleApiError } from '@/lib/auth';
import {
  getPayrollAccess,
  requirePayrollPermission,
} from '@/lib/payroll/access';
import { parsePeriodDate } from '@/lib/payroll/periods';
import { parseJsonBody } from '@/lib/validation';

const FREQUENCIES = ['weekly', 'biweekly', 'monthly'];

async function loadRun(id) {
  const run = await PayrollRun.findById(id)
    .populate('createdBy', 'name')
    .populate('processedBy', 'name')
    .lean();
  if (!run) return null;

  const entries = await PayrollEntry.find({ payrollRun: id })
    .populate('employee', 'name employee_id email profile_image branch_id department_id designation_id')
    .sort({ netPay: -1, createdAt: 1 })
    .lean();

  const payslips = await Payslip.find({
    payrollEntry: { $in: entries.map((entry) => entry._id) },
  })
    .select('payrollEntry payslipNumber status downloadedAt')
    .lean();
  const payslipMap = new Map(
    payslips.map((payslip) => [String(payslip.payrollEntry), payslip])
  );

  run.entries = entries.map((entry) => ({
    ...entry,
    payslip: payslipMap.get(String(entry._id)) || null,
  }));
  return run;
}

export async function GET(request, { params }) {
  try {
    const access = await getPayrollAccess(request);
    if (!access.canViewRuns) {
      return Response.json(
        { message: 'You do not have permission to view payroll runs' },
        { status: 403 }
      );
    }
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Payroll run not found' }, { status: 404 });
    }
    const run = await loadRun(id);
    if (!run) {
      return Response.json({ message: 'Payroll run not found' }, { status: 404 });
    }
    return Response.json({ run, access });
  } catch (error) {
    return handleApiError(error, 'Server error fetching payroll run');
  }
}

export async function PUT(request, { params }) {
  try {
    await requirePayrollPermission(request, 'editRuns');
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Payroll run not found' }, { status: 404 });
    }

    const run = await PayrollRun.findById(id);
    if (!run) {
      return Response.json({ message: 'Payroll run not found' }, { status: 404 });
    }
    if (run.status !== 'draft') {
      return Response.json(
        { message: 'Only draft payroll runs can be edited.' },
        { status: 409 }
      );
    }

    const body = await parseJsonBody(request);
    const title = String(body.title || '').trim();
    const payrollFrequency = String(body.payrollFrequency || run.payrollFrequency);
    const start = parsePeriodDate(body.payPeriodStart, run.payPeriodStart);
    const end = parsePeriodDate(body.payPeriodEnd, run.payPeriodEnd);
    const payDate = parsePeriodDate(body.payDate, run.payDate);

    if (!title) {
      return Response.json({ message: 'Payroll run title is required' }, { status: 400 });
    }
    if (!FREQUENCIES.includes(payrollFrequency)) {
      return Response.json({ message: 'Payroll frequency is invalid' }, { status: 400 });
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

    const duplicate = await PayrollRun.findOne({
      _id: { $ne: run._id },
      payPeriodStart: start,
      payPeriodEnd: end,
    }).select('_id title');
    if (duplicate) {
      return Response.json(
        {
          message: `A payroll run already exists for this pay period (${duplicate.title}).`,
        },
        { status: 409 }
      );
    }

    run.title = title;
    run.payrollFrequency = payrollFrequency;
    run.payPeriodStart = start;
    run.payPeriodEnd = end;
    run.payDate = payDate;
    run.notes = body.notes ? String(body.notes).trim() : null;
    await run.save();

    return Response.json(
      { message: 'Payroll run updated successfully', run },
      { status: 200 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json(
        { message: 'A payroll run already exists for this pay period.' },
        { status: 409 }
      );
    }
    return handleApiError(error, 'Server error updating payroll run');
  }
}

export async function DELETE(request, { params }) {
  try {
    await requirePayrollPermission(request, 'deleteRuns');
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Payroll run not found' }, { status: 404 });
    }

    const run = await PayrollRun.findById(id);
    if (!run) {
      return Response.json({ message: 'Payroll run not found' }, { status: 404 });
    }
    if (run.status !== 'draft') {
      return Response.json(
        { message: 'Only draft payroll runs can be deleted.' },
        { status: 409 }
      );
    }

    const entries = await PayrollEntry.find({ payrollRun: run._id }).select('_id');
    const entryIds = entries.map((entry) => entry._id);
    if (entryIds.length > 0) {
      await Payslip.deleteMany({ payrollEntry: { $in: entryIds } });
      await PayrollEntry.deleteMany({ _id: { $in: entryIds } });
    }
    await run.deleteOne();

    return Response.json({ message: 'Payroll run deleted successfully' });
  } catch (error) {
    return handleApiError(error, 'Server error deleting payroll run');
  }
}
