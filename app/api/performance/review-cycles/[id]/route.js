import connectDB from '@/lib/db';
import ReviewCycle from '@/lib/models/ReviewCycle';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// @route   GET /api/performance/review-cycles/:id
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const reviewCycle = await ReviewCycle.findById(id);

    if (!reviewCycle) {
      return Response.json({ message: 'Review cycle not found' }, { status: 404 });
    }

    return Response.json({ reviewCycle }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Review cycle not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching review cycle');
  }
}

// @route   PUT /api/performance/review-cycles/:id
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);

    const { id } = await params;

    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'name', optional: true, trim: true },
      { field: 'frequency', optional: true, isIn: ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'One-time'] },
      { field: 'description', optional: true, trim: true },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    await connectDB();

    const reviewCycle = await ReviewCycle.findByIdAndUpdate(id, { $set: data }, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!reviewCycle) {
      return Response.json({ message: 'Review cycle not found' }, { status: 404 });
    }

    return Response.json(
      { message: 'Review cycle updated successfully', reviewCycle },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Review cycle not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating review cycle');
  }
}

// @route   DELETE /api/performance/review-cycles/:id
// @access  Private
export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const reviewCycle = await ReviewCycle.findByIdAndDelete(id);

    if (!reviewCycle) {
      return Response.json({ message: 'Review cycle not found' }, { status: 404 });
    }

    return Response.json({ message: 'Review cycle deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Review cycle not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting review cycle');
  }
}
