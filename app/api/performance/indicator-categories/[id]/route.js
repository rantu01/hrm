import connectDB from '@/lib/db';
import PerformanceIndicatorCategory from '@/lib/models/PerformanceIndicatorCategory';
import PerformanceIndicator from '@/lib/models/PerformanceIndicator';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// @route   GET /api/performance/indicator-categories/:id
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const indicatorCategory = await PerformanceIndicatorCategory.findById(id);

    if (!indicatorCategory) {
      return Response.json({ message: 'Indicator category not found' }, { status: 404 });
    }

    return Response.json({ indicatorCategory }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Indicator category not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching indicator category');
  }
}

// @route   PUT /api/performance/indicator-categories/:id
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

    const indicatorCategory = await PerformanceIndicatorCategory.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', runValidators: true }
    );

    if (!indicatorCategory) {
      return Response.json({ message: 'Indicator category not found' }, { status: 404 });
    }

    return Response.json(
      { message: 'Indicator category updated successfully', indicatorCategory },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Indicator category not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating indicator category');
  }
}

// @route   DELETE /api/performance/indicator-categories/:id
// @access  Private
export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const inUse = await PerformanceIndicator.countDocuments({ category_id: id });
    if (inUse > 0) {
      return Response.json(
        { message: 'Cannot delete category as it is being used in performance indicators' },
        { status: 400 }
      );
    }

    const indicatorCategory = await PerformanceIndicatorCategory.findByIdAndDelete(id);

    if (!indicatorCategory) {
      return Response.json({ message: 'Indicator category not found' }, { status: 404 });
    }

    return Response.json({ message: 'Indicator category deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Indicator category not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting indicator category');
  }
}
