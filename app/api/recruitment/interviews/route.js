import connectDB from '@/lib/db';
import Interview from '@/lib/models/Interview';
import Candidate from '@/lib/models/Candidate';
import { handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import {
  authorizeRecruitment,
  sanitize,
  normalizeStringArray,
  toObjectIdOrNull,
  isValidId,
  escapeRegex,
  getSort,
  badRequest,
  getPagination,
  paginationPayload,
  buildStatusCounts,
} from '@/lib/recruitment-server';
import { INTERVIEW_RULES, interviewPostErrors, interviewRefErrors, interviewerIdsError } from '@/lib/recruitment-validation';
import { INTERVIEW_STATUSES } from '@/lib/recruitment';

const POPULATE = [
  { path: 'candidate_id', select: 'first_name last_name email' },
  { path: 'job_id', select: 'title job_code' },
  { path: 'round_id', select: 'name' },
  { path: 'interview_type_id', select: 'name' },
];

// @route   GET /api/recruitment/interviews
// @desc    List interviews (search / filters / status counts / kanban view)
// @access  Private (view-interviews)
export async function GET(request) {
  try {
    await authorizeRecruitment(request, 'view-interviews');
    await connectDB();
    const sp = request.nextUrl.searchParams;

    const filter = {};
    const search = (sp.get('search') || '').trim();
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      const candidates = await Candidate.find({ $or: [{ first_name: rx }, { last_name: rx }, { email: rx }] })
        .select('_id')
        .lean();
      filter.candidate_id = { $in: candidates.map((c) => c._id) };
    }
    for (const key of ['candidate_id', 'job_id', 'round_id', 'interview_type_id']) {
      const value = sp.get(key);
      if (value) filter[key] = toObjectIdOrNull(value) || { $in: [] };
    }

    // Kanban view: the client groups by status, so no status filter/pagination.
    if (sp.get('view') === 'kanban') {
      const interviews = await Interview.find(filter)
        .populate(POPULATE)
        .sort({ scheduled_date: -1 })
        .lean();
      return Response.json({ interviews }, { status: 200 });
    }

    const countFilter = { ...filter };
    const status = sp.get('status');
    if (status && status !== 'all') {
      if (!INTERVIEW_STATUSES.includes(status)) return badRequest('Invalid status selected');
      filter.status = status;
    }

    const { page, limit, skip } = getPagination(sp, 10);
    const sort = getSort(sp, { scheduled_date: 'scheduled_date', created_at: 'createdAt', createdAt: 'createdAt' });

    const [interviews, total, statusAgg] = await Promise.all([
      Interview.find(filter).populate(POPULATE).sort(sort).skip(skip).limit(limit).lean(),
      Interview.countDocuments(filter),
      Interview.aggregate([{ $match: countFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    return Response.json(
      {
        interviews,
        statusCounts: buildStatusCounts(statusAgg, INTERVIEW_STATUSES),
        pagination: paginationPayload(page, limit, total),
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching interviews');
  }
}

// @route   POST /api/recruitment/interviews
// @desc    Schedule an interview for a candidate / round
// @access  Private (create-interviews)
export async function POST(request) {
  try {
    const user = await authorizeRecruitment(request, 'create-interviews');
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

    const refErrorItem = await interviewRefErrors(cleaned);
    if (refErrorItem) return badRequest(refErrorItem);

    const candidate = await Candidate.findById(cleaned.candidate_id).select('job_id').lean();

    const duplicate = await Interview.findOne({ candidate_id: cleaned.candidate_id, round_id: cleaned.round_id })
      .select('_id')
      .lean();
    if (duplicate) {
      return Response.json(
        { message: 'An interview for this candidate in this round already exists' },
        { status: 409 }
      );
    }

    const doc = await Interview.create({
      ...cleaned,
      interviewers: interviewerIds,
      job_id: candidate.job_id,
      created_by: user?._id || null,
    });
    const interview = await Interview.findById(doc._id).populate(POPULATE).lean();

    return Response.json({ message: 'Interview scheduled successfully', interview }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error scheduling interview');
  }
}
