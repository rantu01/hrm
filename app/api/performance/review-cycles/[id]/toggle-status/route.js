import connectDB from '@/lib/db';
import ReviewCycle from '@/lib/models/ReviewCycle';
import { requireAuth, handleApiError } from '@/lib/auth';

// @route   PUT /api/performance/review-cycles/:id/toggle-status
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const cycle = await ReviewCycle.findById(id);
    if (!cycle) {
      return Response.json({ message: 'Review cycle not found' }, { status: 404 });
    }

    cycle.status = cycle.status === 'active' ? 'inactive' : 'active';
    await cycle.save();

    return Response.json(
      { message: 'Review cycle status updated successfully', reviewCycle: cycle },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Review cycle not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error toggling review cycle status');
  }
}
