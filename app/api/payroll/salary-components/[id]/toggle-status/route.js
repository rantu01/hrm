import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import SalaryComponent from '@/lib/models/SalaryComponent';
import { handleApiError } from '@/lib/auth';
import { requirePayrollPermission } from '@/lib/payroll/access';

export async function POST(request, { params }) {
  try {
    const user = await requirePayrollPermission(request, 'editComponents');
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ message: 'Salary component not found' }, { status: 404 });
    }
    const component = await SalaryComponent.findById(id);
    if (!component) {
      return Response.json({ message: 'Salary component not found' }, { status: 404 });
    }
    component.status = component.status === 'active' ? 'inactive' : 'active';
    component.updatedBy = user._id;
    await component.save();
    return Response.json({
      message: `Salary component ${component.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      component,
    });
  } catch (error) {
    return handleApiError(error, 'Server error updating salary component status');
  }
}
