import connectDB from '@/lib/db';
import PerformanceIndicatorCategory from '@/lib/models/PerformanceIndicatorCategory';
import { requireAuth, handleApiError } from '@/lib/auth';

// @route   PUT /api/performance/indicator-categories/:id/toggle-status
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const category = await PerformanceIndicatorCategory.findById(id);
    if (!category) {
      return Response.json({ message: 'Indicator category not found' }, { status: 404 });
    }

    category.status = category.status === 'active' ? 'inactive' : 'active';
    await category.save();

    return Response.json(
      { message: 'Indicator category status updated successfully', indicatorCategory: category },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Indicator category not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error toggling indicator category status');
  }
}
