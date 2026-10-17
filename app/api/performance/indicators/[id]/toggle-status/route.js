import connectDB from '@/lib/db';
import PerformanceIndicator from '@/lib/models/PerformanceIndicator';
import { requireAuth, handleApiError } from '@/lib/auth';

// @route   PUT /api/performance/indicators/:id/toggle-status
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const indicator = await PerformanceIndicator.findById(id);
    if (!indicator) {
      return Response.json({ message: 'Indicator not found' }, { status: 404 });
    }

    indicator.status = indicator.status === 'active' ? 'inactive' : 'active';
    await indicator.save();
    await indicator.populate('category_id', 'name');

    return Response.json(
      { message: 'Indicator status updated successfully', indicator },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Indicator not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error toggling indicator status');
  }
}
