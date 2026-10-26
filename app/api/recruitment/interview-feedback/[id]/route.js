import connectDB from '@/lib/db';
import InterviewFeedback from '@/lib/models/InterviewFeedback';
import Interview from '@/lib/models/Interview';
import { handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import {
  authorizeRecruitment,
  sanitize,
  normalizeStringArray,
  isValidId,
  badRequest,
  notFound,
} from '@/lib/recruitment-server';
import {
  FEEDBACK_RULES,
  FEEDBACK_RATING_FIELDS,
  fieldError,
  interviewerIdsError,
} from '@/lib/recruitment-validation';

const POPULATE = {
  path: 'interview_id',
  populate: [
    { path: 'candidate_id', select: 'first_name last_name email' },
    { path: 'job_id', select: 'title job_code' },
    { path: 'round_id', select: 'name' },
  ],
};

// @route   GET /api/recruitment/interview-feedback/[id]
// @desc    Get a single feedback record
// @access  Private (view-interview-feedback)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'view-interview-feedback');
    if (!isValidId(id)) return badRequest('Invalid feedback id');
    await connectDB();

    const feedback = await InterviewFeedback.findById(id).populate(POPULATE).lean();
    if (!feedback) return notFound('Feedback not found');

    return Response.json({ feedback }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching feedback');
  }
}

// @route   PUT /api/recruitment/interview-feedback/[id]
// @desc    Update a feedback record (interviewers already used by another
//          feedback row for the same interview are rejected)
// @access  Private (edit-interview-feedback)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'edit-interview-feedback');
    if (!isValidId(id)) return badRequest('Invalid feedback id');

    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, FEEDBACK_RULES);
    for (const field of FEEDBACK_RATING_FIELDS) {
      const value = data[field];
      if (value !== undefined && value !== '' && (Number(value) < 0.5 || Number(value) > 5)) {
        errors.push(fieldError(field, 'Ratings must be between 0.5 and 5', value));
      }
    }
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    const interviewerIds = normalizeStringArray(data.interviewer_id);
    const interviewerError = await interviewerIdsError(interviewerIds);
    if (interviewerError) return Response.json({ errors: [interviewerError] }, { status: 400 });

    await connectDB();
    const existing = await InterviewFeedback.findById(id).lean();
    if (!existing) return notFound('Feedback not found');
    if (!(await Interview.exists({ _id: data.interview_id }))) return badRequest('Invalid interview selected');

    // Ids already claimed by OTHER feedback rows for this interview
    const others = await InterviewFeedback.find({ interview_id: data.interview_id, _id: { $ne: id } })
      .select('interviewer_id')
      .lean();
    const usedByOthers = new Set();
    for (const row of others) {
      for (const raw of String(row.interviewer_id || '').split(',')) {
        const value = raw.trim();
        if (value) usedByOthers.add(value);
      }
    }
    const allowed = interviewerIds.filter((value) => !usedByOthers.has(value));
    if (allowed.length === 0) {
      return Response.json(
        { message: 'Feedback has already been submitted for the selected interviewers' },
        { status: 409 }
      );
    }

    const cleaned = sanitize(data);
    delete cleaned.created_by;

    const feedback = await InterviewFeedback.findByIdAndUpdate(
      id,
      { $set: { ...cleaned, interviewer_id: allowed.join(',') } },
      { new: true, runValidators: true }
    )
      .populate(POPULATE)
      .lean();

    await Interview.findByIdAndUpdate(data.interview_id, { $set: { feedback_submitted: true } });

    return Response.json({ message: 'Feedback updated successfully', feedback }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating feedback');
  }
}

// @route   DELETE /api/recruitment/interview-feedback/[id]
// @desc    Delete a feedback record
// @access  Private (delete-interview-feedback)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'delete-interview-feedback');
    if (!isValidId(id)) return badRequest('Invalid feedback id');
    await connectDB();

    const existing = await InterviewFeedback.findById(id).select('_id').lean();
    if (!existing) return notFound('Feedback not found');

    await InterviewFeedback.findByIdAndDelete(id);
    return Response.json({ message: 'Feedback deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting feedback');
  }
}
