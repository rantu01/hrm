import connectDB from '@/lib/db';
import EmployeeReview from '@/lib/models/EmployeeReview';
import EmployeeReviewRating from '@/lib/models/EmployeeReviewRating';
import { requireAuth, handleApiError } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validation';

// @route   GET /api/performance/reviews/:id/ratings
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const review = await EmployeeReview.findById(id);
    if (!review) {
      return Response.json({ message: 'Employee review not found' }, { status: 404 });
    }

    const ratings = await EmployeeReviewRating.find({ review_id: id }).populate({
      path: 'indicator_id',
      select: 'name description measurement_unit target_value category_id',
      populate: { path: 'category_id', select: 'name' },
    });

    return Response.json({ ratings }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee review not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching review ratings');
  }
}

// @route   POST /api/performance/reviews/:id/ratings
// @desc    Upsert ratings + recompute overall_rating, mark completed
// @access  Private
export async function POST(request, { params }) {
  try {
    await requireAuth(request);
    const body = await parseJsonBody(request);

    const { id } = await params;

    const ratings = body?.ratings;
    if (!Array.isArray(ratings) || ratings.length === 0) {
      return Response.json({ message: 'Ratings array is required' }, { status: 400 });
    }

    for (const r of ratings) {
      if (!r?.indicator_id) {
        return Response.json({ message: 'Each rating requires indicator_id' }, { status: 400 });
      }
      const rating = Number(r.rating);
      if (r.rating === undefined || Number.isNaN(rating) || rating < 0 || rating > 5) {
        return Response.json({ message: 'Each rating must be a number between 0 and 5' }, { status: 400 });
      }
    }

    await connectDB();

    const review = await EmployeeReview.findById(id);
    if (!review) {
      return Response.json({ message: 'Employee review not found' }, { status: 404 });
    }

    for (const r of ratings) {
      await EmployeeReviewRating.findOneAndUpdate(
        { review_id: id, indicator_id: r.indicator_id },
        { $set: { rating: Number(r.rating), comments: r.comments ?? null } },
        { upsert: true, new: true, runValidators: true }
      );
    }

    const all = await EmployeeReviewRating.find({ review_id: id });
    const avg = all.length ? all.reduce((sum, r) => sum + Number(r.rating || 0), 0) / all.length : 0;

    review.overall_rating = Math.round(avg * 10) / 10;
    review.status = 'completed';
    review.completion_date = new Date();
    if (body?.comments !== undefined) review.comments = body.comments;
    else if (body?.overall_comments !== undefined) review.comments = body.overall_comments;
    await review.save();

    const populated = await EmployeeReviewRating.find({ review_id: id }).populate({
      path: 'indicator_id',
      select: 'name description measurement_unit target_value category_id',
      populate: { path: 'category_id', select: 'name' },
    });

    return Response.json(
      { message: 'Review submitted successfully', review, ratings: populated },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee review not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error submitting review ratings');
  }
}
