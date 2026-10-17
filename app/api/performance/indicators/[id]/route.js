import connectDB from '@/lib/db';
import PerformanceIndicator from '@/lib/models/PerformanceIndicator';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// @route   GET /api/performance/indicators/:id
// @desc    Get single indicator by ID
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const indicator = await PerformanceIndicator.findById(id).populate('category_id', 'name');

    if (!indicator) {
      return Response.json({ message: 'Indicator not found' }, { status: 404 });
    }

    return Response.json({ indicator }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Indicator not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching indicator');
  }
}

// @route   PUT /api/performance/indicators/:id
// @desc    Update indicator
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);

    const { id } = await params;

    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'name', optional: true, trim: true },
      { field: 'category_id', optional: true },
      { field: 'description', optional: true, trim: true },
      { field: 'measurement_unit', optional: true, trim: true },
      { field: 'target_value', optional: true, trim: true },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    await connectDB();

    const indicator = await PerformanceIndicator.findByIdAndUpdate(id, { $set: data }, {
      returnDocument: 'after',
      runValidators: true,
    }).populate('category_id', 'name');

    if (!indicator) {
      return Response.json({ message: 'Indicator not found' }, { status: 404 });
    }

    return Response.json(
      {
        message: 'Indicator updated successfully',
        indicator,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Indicator not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating indicator');
  }
}

// @route   DELETE /api/performance/indicators/:id
// @desc    Delete indicator
// @access  Private
export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const indicator = await PerformanceIndicator.findByIdAndDelete(id);

    if (!indicator) {
      return Response.json({ message: 'Indicator not found' }, { status: 404 });
    }

    return Response.json({ message: 'Indicator deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Indicator not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting indicator');
  }
}
