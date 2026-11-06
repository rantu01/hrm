import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import EmployeeSalary from '@/lib/models/EmployeeSalary';
import { handleApiError } from '@/lib/auth';
import { requirePayrollPermission } from '@/lib/payroll/access';

export async function POST(request, { params }) {
  try {
    const user = await requirePayrollPermission(request, 'editEmployeeSalaries');
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Employee salary not found' }, { status: 404 });
    }
    const salary = await EmployeeSalary.findById(id);
    if (!salary) {
      return Response.json({ message: 'Employee salary not found' }, { status: 404 });
    }
    salary.isActive = !salary.isActive;
    salary.updatedBy = user._id;
    await salary.save();
    return Response.json({
      message: `Employee salary ${salary.isActive ? 'activated' : 'deactivated'} successfully`,
      salary,
    });
  } catch (error) {
    return handleApiError(error, 'Server error updating employee salary status');
  }
}
