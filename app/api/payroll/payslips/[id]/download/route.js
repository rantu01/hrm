import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Payslip from '@/lib/models/Payslip';
import { handleApiError } from '@/lib/auth';
import { getPayrollAccess } from '@/lib/payroll/access';
import { renderPayslipHtml } from '@/lib/payroll/payslip-html';

export async function GET(request, { params }) {
  try {
    const access = await getPayrollAccess(request);
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Payslip not found' }, { status: 404 });
    }

    const payslip = await Payslip.findById(id)
      .populate({
        path: 'payrollEntry',
        populate: {
          path: 'payrollRun',
          select: 'title payrollFrequency payPeriodStart payPeriodEnd payDate status',
        },
      })
      .populate({
        path: 'employee',
        select:
          'name employee_id email profile_image bank_name account_holder_name account_number bank_identifier_code bank_branch department_id designation_id',
        populate: [
          { path: 'department_id', select: 'name' },
          { path: 'designation_id', select: 'name' },
        ],
      })
      .lean();

    if (!payslip) {
      return Response.json({ message: 'Payslip not found' }, { status: 404 });
    }

    const employeeId = String(payslip.employee?._id || payslip.employee);
    const isOwner =
      access.linkedEmployee &&
      String(access.linkedEmployee._id) === employeeId;

    if (!access.canViewAllPayslips && !isOwner) {
      return Response.json(
        { message: 'You do not have permission to download this payslip' },
        { status: 403 }
      );
    }

    if (!payslip.payrollEntry) {
      return Response.json(
        { message: 'Payslip payroll details are missing' },
        { status: 409 }
      );
    }

    if (payslip.status !== 'downloaded' || !payslip.downloadedAt) {
      await Payslip.updateOne(
        { _id: payslip._id },
        { $set: { status: 'downloaded', downloadedAt: new Date() } }
      );
    }

    const companyName =
      process.env.COMPANY_NAME ||
      process.env.NEXT_PUBLIC_COMPANY_NAME ||
      'LAMHA Tech';

    const html = renderPayslipHtml({
      payslip: {
        ...payslip,
        updatedAt: new Date().toISOString(),
      },
      entry: payslip.payrollEntry,
      employee: payslip.employee,
      run: payslip.payrollEntry.payrollRun,
      companyName,
    });

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error, 'Server error downloading payslip');
  }
}
