import connectDB from '@/lib/db';
import EmployeeGoal from '@/lib/models/EmployeeGoal';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// @route   GET /api/performance/employee-goals/:id
// @desc    Get single employee goal by ID
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const employeeGoal = await EmployeeGoal.findById(id)
      .populate('employee_id', 'name email')
      .populate('goal_type_id', 'name');

    if (!employeeGoal) {
      return Response.json({ message: 'Employee goal not found' }, { status: 404 });
    }

    return Response.json({ employeeGoal }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee goal not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching employee goal');
  }
}

// @route   PUT /api/performance/employee-goals/:id
// @desc    Update employee goal
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);

    const { id } = await params;

    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'title', optional: true, trim: true },
      { field: 'employee_id', optional: true },
      { field: 'goal_type_id', optional: true },
      { field: 'description', optional: true, trim: true },
      { field: 'start_date', optional: true, isISO8601: true, messages: { isISO8601: 'Start date must be a valid date' } },
      { field: 'end_date', optional: true, isISO8601: true, messages: { isISO8601: 'End date must be a valid date' } },
      { field: 'target', optional: true, trim: true },
      { field: 'progress', optional: true, isNumeric: true, messages: { isNumeric: 'Progress must be a number' } },
      { field: 'status', optional: true, isIn: ['not_started', 'in_progress', 'completed'] },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    await connectDB();

    const existing = await EmployeeGoal.findById(id);
    if (!existing) {
      return Response.json({ message: 'Employee goal not found' }, { status: 404 });
    }

    const nextStart = data.start_date ?? existing.start_date;
    const nextEnd = data.end_date ?? existing.end_date;
    if (nextStart && nextEnd && new Date(nextEnd) < new Date(nextStart)) {
      return Response.json({ message: 'End date must be after or equal to start date' }, { status: 400 });
    }

    if (data.progress !== undefined) data.progress = Number(data.progress);

    const employeeGoal = await EmployeeGoal.findByIdAndUpdate(id, { $set: data }, {
      returnDocument: 'after',
      runValidators: true,
    })
      .populate('employee_id', 'name email')
      .populate('goal_type_id', 'name');

    return Response.json(
      {
        message: 'Employee goal updated successfully',
        employeeGoal,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee goal not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating employee goal');
  }
}

// @route   DELETE /api/performance/employee-goals/:id
// @desc    Delete employee goal
// @access  Private
export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const employeeGoal = await EmployeeGoal.findByIdAndDelete(id);

    if (!employeeGoal) {
      return Response.json({ message: 'Employee goal not found' }, { status: 404 });
    }

    return Response.json({ message: 'Employee goal deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee goal not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting employee goal');
  }
}
