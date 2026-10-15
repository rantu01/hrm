import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// All routes require authentication

// @route   GET /api/employees/:id
// @desc    Get single employee by ID
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const employee = await Employee.findById(id).populate(
      'user',
      'name email avatar status type'
    );

    if (!employee) {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }

    return Response.json({ employee }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Get employee error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching employee');
  }
}

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);

    const { id } = await params;

    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'name', optional: true, trim: true },
      { field: 'email', optional: true, isEmail: true, normalizeEmail: true, messages: { isEmail: 'Please provide a valid email' } },
      { field: 'phone', optional: true, trim: true },
      { field: 'designation', optional: true, trim: true },
      { field: 'department', optional: true, trim: true },
      { field: 'branch', optional: true, trim: true },
      { field: 'salary', optional: true, isNumeric: true, messages: { isNumeric: 'Salary must be a number' } },
      { field: 'joinDate', optional: true, isISO8601: true, messages: { isISO8601: 'Join date must be a valid date' } },
      { field: 'status', optional: true, isIn: ['active', 'inactive', 'terminated', 'on-leave'] },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    await connectDB();

    const employee = await Employee.findByIdAndUpdate(id, { $set: data }, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!employee) {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }

    return Response.json(
      {
        message: 'Employee updated successfully',
        employee,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Update employee error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }
    if (error.code === 11000) {
      return Response.json({ message: 'Email already in use' }, { status: 400 });
    }
    return handleApiError(error, 'Server error updating employee');
  }
}

// @route   DELETE /api/employees/:id
// @desc    Delete employee
// @access  Private
export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const employee = await Employee.findByIdAndDelete(id);

    if (!employee) {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }

    return Response.json({ message: 'Employee deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Delete employee error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting employee');
  }
}
