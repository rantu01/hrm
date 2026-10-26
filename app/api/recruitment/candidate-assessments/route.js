import connectDB from '@/lib/db';
import CandidateAssessment from '@/lib/models/CandidateAssessment';
import Candidate from '@/lib/models/Candidate';
import { handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import {
  authorizeRecruitment,
  sanitize,
  escapeRegex,
  toObjectIdOrNull,
  getSort,
  badRequest,
  getPagination,
  paginationPayload,
  buildStatusCounts,
} from '@/lib/recruitment-server';
import {
  ASSESSMENT_RULES,
  assessmentPostErrors,
  assessmentRefErrors,
} from '@/lib/recruitment-validation';
import { ASSESSMENT_STATUSES } from '@/lib/recruitment';

const POPULATE = [{ path: 'candidate_id', select: 'first_name last_name email' }];

// @route   GET /api/recruitment/candidate-assessments
// @desc    List candidate assessments (search / candidate / status)
// @access  Private (view-candidate-assessments)
export async function GET(request) {
  try {
    await authorizeRecruitment(request, 'view-candidate-assessments');
    await connectDB();
    const sp = request.nextUrl.searchParams;

    const filter = {};
    const search = (sp.get('search') || '').trim();
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      const candidates = await Candidate.find({ $or: [{ first_name: rx }, { last_name: rx }, { email: rx }] })
        .select('_id')
        .lean();
      filter.$or = [{ assessment_name: rx }, { candidate_id: { $in: candidates.map((c) => c._id) } }];
    }

    const candidateId = sp.get('candidate_id');
    if (candidateId) filter.candidate_id = toObjectIdOrNull(candidateId) || { $in: [] };

    const countFilter = { ...filter };
    const status = sp.get('status');
    if (status && status !== 'all') {
      if (!ASSESSMENT_STATUSES.includes(status)) return badRequest('Invalid status selected');
      filter.pass_fail_status = status;
    }

    const { page, limit, skip } = getPagination(sp, 10);
    const sort = getSort(sp, {
      assessment_name: 'assessment_name',
      assessment_date: 'assessment_date',
      created_at: 'createdAt',
      createdAt: 'createdAt',
    });

    const [candidateAssessments, total, statusAgg] = await Promise.all([
      CandidateAssessment.find(filter).populate(POPULATE).sort(sort).skip(skip).limit(limit).lean(),
      CandidateAssessment.countDocuments(filter),
      CandidateAssessment.aggregate([
        { $match: countFilter },
        { $group: { _id: '$pass_fail_status', count: { $sum: 1 } } },
      ]),
    ]);

    return Response.json(
      {
        candidateAssessments,
        statusCounts: buildStatusCounts(statusAgg, ASSESSMENT_STATUSES),
        pagination: paginationPayload(page, limit, total),
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching assessments');
  }
}

// @route   POST /api/recruitment/candidate-assessments
// @desc    Record a candidate assessment
// @access  Private (create-candidate-assessments)
export async function POST(request) {
  try {
    const user = await authorizeRecruitment(request, 'create-candidate-assessments');
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, ASSESSMENT_RULES);
    errors.push(...assessmentPostErrors(data));
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    const cleaned = sanitize(data);
    delete cleaned.created_by;
    if (!cleaned.assessment_date) cleaned.assessment_date = new Date();

    await connectDB();
    const refErrorItem = await assessmentRefErrors(cleaned);
    if (refErrorItem) return badRequest(refErrorItem);

    const doc = await CandidateAssessment.create({ ...cleaned, created_by: user?._id || null });
    const assessment = await CandidateAssessment.findById(doc._id).populate(POPULATE).lean();

    return Response.json({ message: 'Assessment created successfully', assessment }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating assessment');
  }
}
