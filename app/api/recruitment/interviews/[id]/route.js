import connectDB from '@/lib/db';
import Interview from '@/lib/models/Interview';
import InterviewFeedback from '@/lib/models/InterviewFeedback';
import Candidate from '@/lib/models/Candidate';
import User from '@/lib/models/User';
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
  INTERVIEW_RULES,
  interviewPostErrors,
  interviewRefErrors,
  interviewerIdsError,
} from '@/lib/recruitment-validation';

const POPULATE = [
  { path: 'candidate_id', select: 'first_name last_name email phone' },
  { path: 'job_id', select: 'title job_code' },
  { path: 'round_id', select: 'name sequence_number' },
  { path: 'interview_type_id', select: 'name' },
];

// @route   GET /api/recruitment/interviews/[id]
// @desc    Get an interview with its feedback and interviewer users
// @access  Private (view-interviews)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'view-interviews');
    if (!isValidId(id)) return badRequest('Invalid interview id');
    await connectDB();

    const interview = await Interview.findById(id).populate(POPULATE).lean();
    if (!interview) return notFound('Interview not found');

    // `interviewers` may hold legacy display names; only ids resolve to users.
    const interviewerIds = (interview.interviewers || []).filter(isValidId);
    const [feedback, interviewerUsers] = await Promise.all([
      InterviewFeedback.find({ interview_id: id }).sort({ createdAt: -1 }).lean(),
      interviewerIds.length > 0
        ? User.find({ _id: { $in: interviewerIds } }).select('name email avatar').lean()
        : Promise.resolve([]),
    ]);

    return Response.json({ interview, feedback, interviewerUsers }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching interview');
  }
}

// @route   PUT /api/recruitment/interviews/[id]
// @desc    Update an interview (status changes go through /status)
// @access  Private (edit-interviews)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'edit-interviews');
    if (!isValidId(id)) return badRequest('Invalid interview id');

    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, INTERVIEW_RULES);
    errors.push(...interviewPostErrors(data));
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    const interviewerIds = normalizeStringArray(body.interviewers);
    const interviewerError = await interviewerIdsError(interviewerIds);
    if (interviewerError) return Response.json({ errors: [interviewerError] }, { status: 400 });

    const cleaned = sanitize(data);
    delete cleaned.status;
    delete cleaned.feedback_submitted;

    await connectDB();
    const existing = await Interview.findById(id).select('_id').lean();
    if (!existing) return notFound('Interview not found');

    const refErrorItem = await interviewRefErrors(cleaned);
    if (refErrorItem) return badRequest(refErrorItem);

    const candidate = await Candidate.findById(cleaned.candidate_id).select('job_id').lean();

    const duplicate = await Interview.findOne({
      candidate_id: cleaned.candidate_id,
      round_id: cleaned.round_id,
      _id: { $ne: id },
    })
      .select('_id')
      .lean();
    if (duplicate) {
      return Response.json(
        { message: 'An interview for this candidate in this round already exists' },
        { status: 409 }
      );
    }

    const interview = await Interview.findByIdAndUpdate(
      id,
      // job_id is always refreshed from the candidate (mirrors the reference)
      { $set: { ...cleaned, interviewers: interviewerIds, job_id: candidate.job_id } },
      { new: true, runValidators: true }
    )
      .populate(POPULATE)
      .lean();

    return Response.json({ message: 'Interview updated successfully', interview }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating interview');
  }
}

// @route   DELETE /api/recruitment/interviews/[id]
// @desc    Delete an interview and cascade its feedback (SQL schema cascades)
// @access  Private (delete-interviews)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'delete-interviews');
    if (!isValidId(id)) return badRequest('Invalid interview id');
    await connectDB();

    const existing = await Interview.findById(id).select('_id').lean();
    if (!existing) return notFound('Interview not found');

    await Promise.all([Interview.findByIdAndDelete(id), InterviewFeedback.deleteMany({ interview_id: id })]);

    return Response.json({ message: 'Interview deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting interview');
  }
}
