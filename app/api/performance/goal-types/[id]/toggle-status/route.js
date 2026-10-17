import connectDB from '@/lib/db';
import GoalType from '@/lib/models/GoalType';
import { requireAuth, handleApiError } from '@/lib/auth';

// @route   PUT /api/performance/goal-types/:id/toggle-status
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const goalType = await GoalType.findById(id);
    if (!goalType) {
      return Response.json({ message: 'Goal type not found' }, { status: 404 });
    }

    goalType.status = goalType.status === 'active' ? 'inactive' : 'active';
    await goalType.save();

    return Response.json(
      { message: 'Goal type status updated successfully', goalType },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Goal type not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error toggling goal type status');
  }
}
