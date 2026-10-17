import connectDB from '@/lib/db';
import EmployeeGoal from '@/lib/models/EmployeeGoal';
import { requireAuth, handleApiError } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validation';

// @route   PUT /api/performance/employee-goals/:id/update-progress
// @desc    Update goal progress (auto-derives status)
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);

    const { id } = await params;

    const body = await parseJsonBody(request);
    const progress = Number(body?.progress);

    if (body?.progress === undefined || body?.progress === null || body?.progress === '') {
      return Response.json({ message: 'Progress is required' }, { status: 400 });
    }
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      return Response.json({ message: 'Progress must be an integer between 0 and 100' }, { status: 400 });
    }

    await connectDB();

    const goal = await EmployeeGoal.findById(id);
    if (!goal) {
      return Response.json({ message: 'Employee goal not found' }, { status: 404 });
    }

    let status = goal.status;
    if (progress === 100) status = 'completed';
    else if (progress > 0) status = 'in_progress';
    else status = 'not_started';

    goal.progress = progress;
    goal.status = status;
    await goal.save();
    await goal.populate('employee_id', 'name email');
    await goal.populate('goal_type_id', 'name');

    return Response.json(
      { message: 'Goal progress updated successfully', employeeGoal: goal },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee goal not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating goal progress');
  }
}
