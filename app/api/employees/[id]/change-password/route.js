import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import User from '@/lib/models/User';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// @route   PUT /api/employees/:id/change-password
// @desc    Change the linked login User password
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);

    const { id } = await params;
    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'password', required: true, minLength: 8, messages: { required: 'Password is required', minLength: 'Password must be at least 8 characters' } },
      { field: 'password_confirmation', required: true, messages: { required: 'Password confirmation is required' } },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    if (data.password !== body.password_confirmation) {
      return Response.json({ message: 'Password confirmation does not match' }, { status: 400 });
    }

    await connectDB();

    const employee = await Employee.findById(id);
    if (!employee) {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }

    if (!employee.user) {
      return Response.json({ message: 'This employee has no linked login account' }, { status: 400 });
    }

    const linked = await User.findById(employee.user);
    if (!linked) {
      return Response.json({ message: 'This employee has no linked login account' }, { status: 400 });
    }

    linked.password = data.password;
    await linked.save();

    return Response.json({ message: 'Employee password changed successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Change employee password error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error changing employee password');
  }
}
