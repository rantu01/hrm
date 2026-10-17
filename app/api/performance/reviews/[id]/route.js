import connectDB from '@/lib/db';
import EmployeeReview from '@/lib/models/EmployeeReview';
import EmployeeReviewRating from '@/lib/models/EmployeeReviewRating';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// @route   GET /api/performance/reviews/:id
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const review = await EmployeeReview.findById(id)
      .populate('employee_id', 'name email')
      .populate('reviewer_id', 'name email')
      .populate('review_cycle_id', 'name frequency');

    if (!review) {
      return Response.json({ message: 'Employee review not found' }, { status: 404 });
    }

    const ratings = await EmployeeReviewRating.find({ review_id: id }).populate({
      path: 'indicator_id',
      select: 'name description measurement_unit target_value category_id',
      populate: { path: 'category_id', select: 'name' },
    });

    return Response.json({ review, ratings }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee review not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching employee review');
  }
}

// @route   PUT /api/performance/reviews/:id
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);

    const { id } = await params;

    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'review_date', optional: true, isISO8601: true, messages: { isISO8601: 'Review date must be a valid date' } },
      { field: 'completion_date', optional: true, isISO8601: true, messages: { isISO8601: 'Completion date must be a valid date' } },
      { field: 'comments', optional: true, trim: true },
      { field: 'status', optional: true, isIn: ['pending', 'in_progress', 'completed'] },
      { field: 'overall_rating', optional: true, isNumeric: true, messages: { isNumeric: 'Overall rating must be a number' } },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    await connectDB();

    const review = await EmployeeReview.findByIdAndUpdate(id, { $set: data }, {
      returnDocument: 'after',
      runValidators: true,
    })
      .populate('employee_id', 'name email')
      .populate('reviewer_id', 'name email')
      .populate('review_cycle_id', 'name frequency');

    if (!review) {
      return Response.json({ message: 'Employee review not found' }, { status: 404 });
    }

    return Response.json({ message: 'Employee review updated successfully', review }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee review not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating employee review');
  }
}

// @route   DELETE /api/performance/reviews/:id
// @access  Private
export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const review = await EmployeeReview.findByIdAndDelete(id);
    if (!review) {
      return Response.json({ message: 'Employee review not found' }, { status: 404 });
    }

    await EmployeeReviewRating.deleteMany({ review_id: id });

    return Response.json({ message: 'Employee review deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee review not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting employee review');
  }
}
