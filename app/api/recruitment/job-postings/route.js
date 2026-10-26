import connectDB from '@/lib/db';
import JobPosting from '@/lib/models/JobPosting';
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
  JOB_POSTING_RULES,
  jobPostingPostErrors,
  jobPostingRefErrors,
  cleanJobPostingPayload,
  generateJobCode,
} from '@/lib/recruitment-validation';
import { JOB_STATUSES } from '@/lib/recruitment';

const POPULATE = [
  { path: 'job_type_id', select: 'name' },
  { path: 'location_id', select: 'name city is_remote' },
  { path: 'branch_id', select: 'name' },
  { path: 'department_id', select: 'name' },
  { path: 'category_id', select: 'name' },
];

// @route   GET /api/recruitment/job-postings
// @desc    List job postings with search, filters, sorting, status counts and
//          live applicant statistics
// @access  Private (view-job-postings)
export async function GET(request) {
  try {
    await authorizeRecruitment(request, 'view-job-postings');
    await connectDB();
    const sp = request.nextUrl.searchParams;

    const filter = {};
    const search = (sp.get('search') || '').trim();
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      filter.$or = [
        { title: rx },
        { job_code: rx },
        { description: rx },
        { requirements: rx },
        { skills: rx },
      ];
    }

    for (const key of ['job_type_id', 'location_id', 'branch_id', 'department_id', 'category_id']) {
      const value = sp.get(key);
      if (value && value !== 'all') filter[key] = toObjectIdOrNull(value) || { $in: [] };
    }

    const countFilter = { ...filter };
    const status = sp.get('status');
    if (status && status !== 'all') {
      if (!JOB_STATUSES.includes(status)) return badRequest('Invalid status selected');
      filter.status = status;
    }

    const { page, limit, skip } = getPagination(sp, 10);
    const sort = getSort(sp, {
      title: 'title',
      job_code: 'job_code',
      status: 'status',
      publish_date: 'publish_date',
      application_deadline: 'application_deadline',
      start_date: 'start_date',
      created_at: 'createdAt',
      createdAt: 'createdAt',
    });

    const [jobs, total, statusAgg] = await Promise.all([
      JobPosting.find(filter).populate(POPULATE).sort(sort).skip(skip).limit(limit).lean(),
      JobPosting.countDocuments(filter),
      JobPosting.aggregate([{ $match: countFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    // Attach applicant statistics per job posting
    const ids = jobs.map((j) => j._id);
    const appCounts = ids.length
      ? await Candidate.aggregate([
          { $match: { job_id: { $in: ids } } },
          {
            $group: {
              _id: '$job_id',
              applicants: { $sum: 1 },
              shortlisted: {
                $sum: { $cond: [{ $in: ['$status', ['Screening', 'Interview', 'Offer']] }, 1, 0] },
              },
              hired: { $sum: { $cond: [{ $eq: ['$status', 'Hired'] }, 1, 0] } },
            },
          },
        ])
      : [];
    const countMap = Object.fromEntries(appCounts.map((c) => [String(c._id), c]));
    const jobPostings = jobs.map((job) => ({
      ...job,
      applicants: countMap[String(job._id)]?.applicants || 0,
      shortlisted: countMap[String(job._id)]?.shortlisted || 0,
      hired: countMap[String(job._id)]?.hired || 0,
    }));

    return Response.json(
      {
        jobPostings,
        statusCounts: buildStatusCounts(statusAgg, JOB_STATUSES),
        pagination: paginationPayload(page, limit, total),
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching job postings');
  }
}

// @route   POST /api/recruitment/job-postings
// @desc    Create a job posting (job code is generated when omitted)
// @access  Private (create-job-postings)
export async function POST(request) {
  try {
    const user = await authorizeRecruitment(request, 'create-job-postings');
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, JOB_POSTING_RULES);
    errors.push(...jobPostingPostErrors(data));
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    const cleaned = cleanJobPostingPayload(data);

    await connectDB();
    const refErrorItem = await jobPostingRefErrors(cleaned);
    if (refErrorItem) return badRequest(refErrorItem);

    if (cleaned.job_code) {
      if (await JobPosting.exists({ job_code: cleaned.job_code })) {
        return Response.json({ message: 'Job code already exists' }, { status: 409 });
      }
    } else {
      cleaned.job_code = await generateJobCode();
    }

    const doc = await JobPosting.create({ ...cleaned, created_by: user?._id || null });
    const jobPosting = await JobPosting.findById(doc._id).populate(POPULATE).lean();

    return Response.json(
      { message: 'Job posting created successfully', jobPosting: { ...jobPosting, applicants: 0, shortlisted: 0, hired: 0 } },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) return Response.json({ message: 'Job code already exists' }, { status: 409 });
    return handleApiError(error, 'Server error creating job posting');
  }
}
