import connectDB from '@/lib/db';
import InterviewFeedback from '@/lib/models/InterviewFeedback';
import Interview from '@/lib/models/Interview';
import Candidate from '@/lib/models/Candidate';
import { handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import {
  authorizeRecruitment,
  sanitize,
  normalizeStringArray,
  escapeRegex,
  badRequest,
  getPagination,
  paginationPayload,
} from '@/lib/recruitment-server';
import {
  FEEDBACK_RULES,
  FEEDBACK_RATING_FIELDS,
  fieldError,
  interviewerIdsError,
} from '@/lib/recruitment-validation';
import { FEEDBACK_RECOMMENDATIONS } from '@/lib/recruitment';

const POPULATE = {
  path: 'interview_id',
  populate: [
    { path: 'candidate_id', select: 'first_name last_name email' },
    { path: 'job_id', select: 'title job_code' },
    { path: 'round_id', select: 'name' },
  ],
};

// @route   GET /api/recruitment/interview-feedback
// @desc    List interview feedback (search / recommendation / interviewer)
// @access  Private (view-interview-feedback)
export async function GET(request) {
  try {
    await authorizeRecruitment(request, 'view-interview-feedback');
    await connectDB();
    const sp = request.nextUrl.searchParams;

    const filter = {};
    const search = (sp.get('search') || '').trim();
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      const candidates = await Candidate.find({ $or: [{ first_name: rx }, { last_name: rx }, { email: rx }] })
        .select('_id')
        .lean();
      const interviews = await Interview.find({ candidate_id: { $in: candidates.map((c) => c._id) } })
        .select('_id')
        .lean();
      filter.interview_id = { $in: interviews.map((i) => i._id) };
    }

    const recommendation = sp.get('recommendation');
    if (recommendation && recommendation !== 'all') {
      if (!FEEDBACK_RECOMMENDATIONS.includes(recommendation)) return badRequest('Invalid recommendation selected');
      filter.recommendation = recommendation;
    }

    const interviewerId = (sp.get('interviewer_id') || '').trim();
    if (interviewerId) {
      // interviewer_id is a comma separated list of user ids
      filter.interviewer_id = { $regex: `(^|,)${escapeRegex(interviewerId)}(,|$)` };
    }

    const { page, limit, skip } = getPagination(sp, 10);

    const [interviewFeedback, total] = await Promise.all([
      InterviewFeedback.find(filter)
        .populate(POPULATE)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InterviewFeedback.countDocuments(filter),
    ]);

    return Response.json(
      { interviewFeedback, pagination: paginationPayload(page, limit, total) },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching interview feedback');
  }
}

// @route   POST /api/recruitment/interview-feedback
// @desc    Submit feedback for an interview (one row per interviewer)
// @access  Private (create-interview-feedback)
export async function POST(request) {
  try {
    const user = await authorizeRecruitment(request, 'create-interview-feedback');
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

    if (!(await Interview.exists({ _id: data.interview_id }))) return badRequest('Invalid interview selected');

    // Reference behaviour: keep only interviewers that have not submitted
    // feedback for this interview yet.
    const existing = await InterviewFeedback.find({ interview_id: data.interview_id })
      .select('interviewer_id')
      .lean();
    const used = new Set();
    for (const row of existing) {
      for (const raw of String(row.interviewer_id || '').split(',')) {
        const value = raw.trim();
        if (value) used.add(value);
      }
    }
    const remaining = interviewerIds.filter((id) => !used.has(id));
    if (remaining.length === 0) {
      return Response.json(
        { message: 'Feedback has already been submitted for the selected interviewers' },
        { status: 409 }
      );
    }

    const cleaned = sanitize(data);
    const doc = await InterviewFeedback.create({
      ...cleaned,
      interviewer_id: remaining.join(','),
      created_by: user?._id || null,
    });

    // Side effect: the interview is considered "feedback submitted" once any
    // feedback exists (matches the reference).
    await Interview.findByIdAndUpdate(data.interview_id, { $set: { feedback_submitted: true } });

    const feedback = await InterviewFeedback.findById(doc._id).populate(POPULATE).lean();

    return Response.json({ message: 'Feedback submitted successfully', feedback }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error submitting feedback');
  }
}
