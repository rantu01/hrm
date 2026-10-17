import connectDB from '@/lib/db';
import GoalType from '@/lib/models/GoalType';
import EmployeeGoal from '@/lib/models/EmployeeGoal';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// @route   GET /api/performance/goal-types/:id
// @desc    Get single goal type by ID
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const goalType = await GoalType.findById(id);

    if (!goalType) {
      return Response.json({ message: 'Goal type not found' }, { status: 404 });
    }

    return Response.json({ goalType }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Goal type not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching goal type');
  }
}

// @route   PUT /api/performance/goal-types/:id
// @desc    Update goal type
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);

    const { id } = await params;

    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'name', optional: true, trim: true },
      { field: 'description', optional: true, trim: true },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    await connectDB();

    const goalType = await GoalType.findByIdAndUpdate(id, { $set: data }, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!goalType) {
      return Response.json({ message: 'Goal type not found' }, { status: 404 });
    }

    return Response.json(
      {
        message: 'Goal type updated successfully',
        goalType,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Goal type not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating goal type');
  }
}

// @route   DELETE /api/performance/goal-types/:id
// @desc    Delete goal type
// @access  Private
export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const inUse = await EmployeeGoal.countDocuments({ goal_type_id: id });
    if (inUse > 0) {
      return Response.json(
        { message: 'Cannot delete goal type as it is being used in employee goals' },
        { status: 400 }
      );
    }

    const goalType = await GoalType.findByIdAndDelete(id);

    if (!goalType) {
      return Response.json({ message: 'Goal type not found' }, { status: 404 });
    }

    return Response.json({ message: 'Goal type deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Goal type not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting goal type');
  }
}
