import connectDB from '@/lib/db';
import Offer from '@/lib/models/Offer';
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
import { OFFER_RULES, offerPostErrors, offerRefErrors } from '@/lib/recruitment-validation';
import { OFFER_STATUSES } from '@/lib/recruitment';

const POPULATE = [
  { path: 'candidate_id', select: 'first_name last_name email' },
  { path: 'job_id', select: 'title job_code' },
  { path: 'department_id', select: 'name' },
  { path: 'approved_by', select: 'name' },
];

// @route   GET /api/recruitment/offers
// @desc    List offers (search / filters / status counts / kanban view)
// @access  Private (view-offers)
export async function GET(request) {
  try {
    await authorizeRecruitment(request, 'view-offers');
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

    const candidateId = sp.get('candidate_id');
    if (candidateId) filter.candidate_id = toObjectIdOrNull(candidateId) || { $in: [] };
    const jobId = sp.get('job_id');
    if (jobId) filter.job_id = toObjectIdOrNull(jobId) || { $in: [] };

    // Kanban view: client groups by status, so no status filter / pagination.
    if (sp.get('view') === 'kanban') {
      const offers = await Offer.find(filter).populate(POPULATE).sort({ createdAt: -1 }).lean();
      return Response.json({ offers }, { status: 200 });
    }

    const countFilter = { ...filter };
    const status = sp.get('status');
    if (status && status !== 'all') {
      if (!OFFER_STATUSES.includes(status)) return badRequest('Invalid status selected');
      filter.status = status;
    }

    const { page, limit, skip } = getPagination(sp, 10);
    const sort = getSort(sp, {
      offer_date: 'offer_date',
      created_at: 'createdAt',
      createdAt: 'createdAt',
    });

    const [offers, total, statusAgg] = await Promise.all([
      Offer.find(filter).populate(POPULATE).sort(sort).skip(skip).limit(limit).lean(),
      Offer.countDocuments(filter),
      Offer.aggregate([{ $match: countFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    return Response.json(
      {
        offers,
        statusCounts: buildStatusCounts(statusAgg, OFFER_STATUSES),
        pagination: paginationPayload(page, limit, total),
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching offers');
  }
}

// @route   POST /api/recruitment/offers
// @desc    Create an offer for a candidate
// @access  Private (create-offers)
export async function POST(request) {
  try {
    const user = await authorizeRecruitment(request, 'create-offers');
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, OFFER_RULES);
    errors.push(...offerPostErrors(data));
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    const cleaned = sanitize(data);
    delete cleaned.created_by;
    delete cleaned.status;
    delete cleaned.response_date;
    delete cleaned.decline_reason;

    await connectDB();
    const refErrorItem = await offerRefErrors(cleaned);
    if (refErrorItem) return badRequest(refErrorItem);

    const candidate = await Candidate.findById(cleaned.candidate_id).select('job_id').lean();
    if (!candidate) return badRequest('Invalid candidate selected');
    cleaned.job_id = candidate.job_id;
    cleaned.offer_date = new Date();

    const duplicate = await Offer.findOne({ candidate_id: cleaned.candidate_id, job_id: cleaned.job_id })
      .select('_id')
      .lean();
    if (duplicate) {
      return Response.json(
        { message: 'An offer already exists for this candidate and job' },
        { status: 409 }
      );
    }

    const doc = await Offer.create({ ...cleaned, created_by: user?._id || null });
    const offer = await Offer.findById(doc._id).populate(POPULATE).lean();

    return Response.json({ message: 'Offer created successfully', offer }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating offer');
  }
}
