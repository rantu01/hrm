import connectDB from '@/lib/db';
import Candidate from '@/lib/models/Candidate';
import { handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import {
  authorizeRecruitment,
  toObjectIdOrNull,
  searchFilter,
  getSort,
  badRequest,
  getPagination,
  paginationPayload,
  buildStatusCounts,
} from '@/lib/recruitment-server';
import {
  CANDIDATE_CREATE_RULES,
  candidatePostErrors,
  candidateRefErrors,
  cleanCandidatePayload,
} from '@/lib/recruitment-validation';
import { CANDIDATE_STATUSES } from '@/lib/recruitment';

const POPULATE = [
  { path: 'job_id', select: 'title job_code' },
  { path: 'source_id', select: 'name' },
  { path: 'branch_id', select: 'name' },
  { path: 'department_id', select: 'name' },
];

// @route   GET /api/recruitment/candidates
// @desc    List candidates (search / filters / status counts / kanban view)
// @access  Private (view-candidates)
export async function GET(request) {
  try {
    await authorizeRecruitment(request, 'view-candidates');
    await connectDB();
    const sp = request.nextUrl.searchParams;

    const filter = {};
    const or = searchFilter(sp, ['first_name', 'last_name', 'email']);
    if (or) filter.$or = or.$or;

    const jobId = sp.get('job_id');
    if (jobId) filter.job_id = toObjectIdOrNull(jobId) || { $in: [] };
    const sourceId = sp.get('source_id');
    if (sourceId) filter.source_id = toObjectIdOrNull(sourceId) || { $in: [] };

    // Kanban view: the full pipeline grouped by status on the client, so no
    // status filter, pagination or counts.
    if (sp.get('view') === 'kanban') {
      const candidates = await Candidate.find(filter)
        .populate('job_id', 'title job_code')
        .populate('source_id', 'name')
        .sort({ createdAt: -1 })
        .lean();
      return Response.json({ candidates }, { status: 200 });
    }

    const countFilter = { ...filter };
    const status = sp.get('status');
    if (status && status !== 'all') {
      if (!CANDIDATE_STATUSES.includes(status)) return badRequest('Invalid status selected');
      filter.status = status;
    }

    const { page, limit, skip } = getPagination(sp, 10);
    const sort = getSort(sp, {
      first_name: 'first_name',
      application_date: 'application_date',
      created_at: 'createdAt',
      createdAt: 'createdAt',
    });

    const [candidates, total, statusAgg] = await Promise.all([
      Candidate.find(filter).populate(POPULATE).sort(sort).skip(skip).limit(limit).lean(),
      Candidate.countDocuments(filter),
      Candidate.aggregate([{ $match: countFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    return Response.json(
      {
        candidates,
        statusCounts: buildStatusCounts(statusAgg, CANDIDATE_STATUSES),
        pagination: paginationPayload(page, limit, total),
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching candidates');
  }
}

// @route   POST /api/recruitment/candidates
// @desc    Create a candidate (a candidate IS a job application)
// @access  Private (create-candidates)
export async function POST(request) {
  try {
    const user = await authorizeRecruitment(request, 'create-candidates');
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, CANDIDATE_CREATE_RULES);
    errors.push(...candidatePostErrors(data));
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    const cleaned = cleanCandidatePayload(data);

    await connectDB();

    const refErrorItem = await candidateRefErrors(cleaned, { requiredJob: true });
    if (refErrorItem) return badRequest(refErrorItem);

    const duplicate = await Candidate.findOne({ email: cleaned.email, job_id: cleaned.job_id })
      .select('_id')
      .lean();
    if (duplicate) {
      return Response.json({ message: 'This candidate has already applied to this job' }, { status: 409 });
    }

    const doc = await Candidate.create({ ...cleaned, created_by: user?._id || null });
    const candidate = await Candidate.findById(doc._id).populate(POPULATE).lean();

    return Response.json({ message: 'Candidate created successfully', candidate }, { status: 201 });
  } catch (error) {
    // Race on the unique { email, job_id } index
    if (error?.code === 11000) {
      return Response.json({ message: 'This candidate has already applied to this job' }, { status: 409 });
    }
    return handleApiError(error, 'Server error creating candidate');
  }
}
