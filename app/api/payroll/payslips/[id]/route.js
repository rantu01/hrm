import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Payslip from '@/lib/models/Payslip';
import { handleApiError } from '@/lib/auth';
import {
  getPayrollAccess,
  requirePayrollPermission,
} from '@/lib/payroll/access';

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
      .populate(
        'employee',
        'name employee_id email profile_image department_id designation_id bank_name account_holder_name account_number bank_identifier_code bank_branch'
      )
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
        { message: 'You do not have permission to view this payslip' },
        { status: 403 }
      );
    }

    return Response.json({ payslip, access });
  } catch (error) {
    return handleApiError(error, 'Server error fetching payslip');
  }
}

export async function DELETE(request, { params }) {
  try {
    await requirePayrollPermission(request, 'deletePayslips');
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Payslip not found' }, { status: 404 });
    }
    const payslip = await Payslip.findByIdAndDelete(id);
    if (!payslip) {
      return Response.json({ message: 'Payslip not found' }, { status: 404 });
    }
    return Response.json({ message: 'Payslip deleted successfully' });
  } catch (error) {
    return handleApiError(error, 'Server error deleting payslip');
  }
}
