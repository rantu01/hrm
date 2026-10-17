import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import User from '@/lib/models/User';
import { requireAuth, handleApiError } from '@/lib/auth';

// @route   PUT /api/employees/:id/toggle-status
// @desc    Flip the linked login User status when one exists, otherwise flip employee_status
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const employee = await Employee.findById(id);
    if (!employee) {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }

    let message;
    if (employee.user) {
      const linked = await User.findById(employee.user);
      if (linked) {
        linked.status = linked.status === 'active' ? 'inactive' : 'active';
        await linked.save();
        message = `Employee login ${linked.status === 'active' ? 'activated' : 'deactivated'} successfully`;
      } else {
        employee.employee_status = employee.employee_status === 'active' ? 'inactive' : 'active';
        await employee.save();
        message = `Employee ${employee.employee_status === 'active' ? 'activated' : 'deactivated'} successfully`;
      }
    } else {
      employee.employee_status = employee.employee_status === 'active' ? 'inactive' : 'active';
      await employee.save();
      message = `Employee ${employee.employee_status === 'active' ? 'activated' : 'deactivated'} successfully`;
    }

    const updated = await Employee.findById(id)
      .populate('branch_id', 'name')
      .populate('department_id', 'name')
      .populate('designation_id', 'name')
      .populate('user', 'name email status');

    return Response.json({ message, employee: updated }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Toggle employee status error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating employee status');
  }
}
