import connectDB from '@/lib/db';
import CandidateOnboarding from '@/lib/models/CandidateOnboarding';
import User from '@/lib/models/User';
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
import { ONBOARDING_RULES, onboardingRefErrors } from '@/lib/recruitment-validation';
import { ONBOARDING_STATUSES } from '@/lib/recruitment';

const POPULATE = [
  { path: 'employee_id', select: 'name email' },
  { path: 'checklist_id', select: 'name' },
  { path: 'buddy_employee_id', select: 'name' },
];

// @route   GET /api/recruitment/candidate-onboarding
// @desc    List onboarding processes (search / checklist / status)
// @access  Private (view-candidate-onboarding)
export async function GET(request) {
  try {
    await authorizeRecruitment(request, 'view-candidate-onboarding');
    await connectDB();
    const sp = request.nextUrl.searchParams;

    const filter = {};
    const search = (sp.get('search') || '').trim();
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      const users = await User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id').lean();
      const ids = users.map((u) => u._id);
      filter.$or = [{ employee_id: { $in: ids } }, { buddy_employee_id: { $in: ids } }];
    }

    const checklistId = sp.get('checklist_id');
    if (checklistId) filter.checklist_id = toObjectIdOrNull(checklistId) || { $in: [] };

    const countFilter = { ...filter };
    const status = sp.get('status');
    if (status && status !== 'all') {
      if (!ONBOARDING_STATUSES.includes(status)) return badRequest('Invalid status selected');
      filter.status = status;
    }

    const { page, limit, skip } = getPagination(sp, 10);
    const sort = getSort(sp, {
      start_date: 'start_date',
      created_at: 'createdAt',
      createdAt: 'createdAt',
    });

    const [candidateOnboardings, total, statusAgg] = await Promise.all([
      CandidateOnboarding.find(filter).populate(POPULATE).sort(sort).skip(skip).limit(limit).lean(),
      CandidateOnboarding.countDocuments(filter),
      CandidateOnboarding.aggregate([
        { $match: countFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return Response.json(
      {
        candidateOnboardings,
        statusCounts: buildStatusCounts(statusAgg, ONBOARDING_STATUSES),
        pagination: paginationPayload(page, limit, total),
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching onboarding processes');
  }
}

// @route   POST /api/recruitment/candidate-onboarding
// @desc    Start an onboarding process for an employee
// @access  Private (create-candidate-onboarding)
export async function POST(request) {
  try {
    const user = await authorizeRecruitment(request, 'create-candidate-onboarding');
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, ONBOARDING_RULES);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    const cleaned = sanitize(data);
    delete cleaned.created_by;
    delete cleaned.status;

    await connectDB();
    const refErrorItem = await onboardingRefErrors(cleaned);
    if (refErrorItem) return badRequest(refErrorItem);

    const duplicate = await CandidateOnboarding.findOne({
      employee_id: cleaned.employee_id,
      checklist_id: cleaned.checklist_id,
    })
      .select('_id')
      .lean();
    if (duplicate) {
      return Response.json(
        { message: 'An onboarding process already exists for this employee with this checklist' },
        { status: 409 }
      );
    }

    const doc = await CandidateOnboarding.create({ ...cleaned, created_by: user?._id || null });
    const onboarding = await CandidateOnboarding.findById(doc._id).populate(POPULATE).lean();

    return Response.json({ message: 'Onboarding created successfully', onboarding }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating onboarding process');
  }
}
