import connectDB from '@/lib/db';
import JobPosting from '@/lib/models/JobPosting';
import Candidate from '@/lib/models/Candidate';
import { handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import { authorizeRecruitment, isValidId, badRequest, notFound } from '@/lib/recruitment-server';
import {
  JOB_POSTING_RULES,
  jobPostingPostErrors,
  jobPostingRefErrors,
  cleanJobPostingPayload,
} from '@/lib/recruitment-validation';
import { CANDIDATE_STATUSES } from '@/lib/recruitment';

const POPULATE = [
  { path: 'job_type_id', select: 'name' },
  { path: 'location_id', select: 'name address city state country postal_code is_remote' },
  { path: 'branch_id', select: 'name' },
  { path: 'department_id', select: 'name' },
  { path: 'category_id', select: 'name' },
  { path: 'custom_question', select: 'question required' },
  { path: 'created_by', select: 'name' },
];

// @route   GET /api/recruitment/job-postings/[id]
// @desc    Get a job posting with candidate statistics
// @access  Private (view-job-postings)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'view-job-postings');
    if (!isValidId(id)) return badRequest('Invalid job posting id');
    await connectDB();

    const jobPosting = await JobPosting.findById(id).populate(POPULATE).lean();
    if (!jobPosting) return notFound('Job posting not found');

    const [candidateStatusAgg, interviewsCount, offersCount] = await Promise.all([
      Candidate.aggregate([
        { $match: { job_id: jobPosting._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Candidate.countDocuments({ job_id: jobPosting._id }),
      Candidate.countDocuments({ job_id: jobPosting._id, status: 'Offer' }),
    ]);

    const candidateStatusCounts = { all: 0 };
    for (const status of CANDIDATE_STATUSES) candidateStatusCounts[status] = 0;
    for (const row of candidateStatusAgg) {
      if (row._id && row._id in candidateStatusCounts) candidateStatusCounts[row._id] = row.count;
      candidateStatusCounts.all += row.count;
    }

    return Response.json(
      {
        jobPosting,
        candidateStatusCounts,
        applicants: interviewsCount,
        offers: offersCount,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching job posting');
  }
}

// @route   PUT /api/recruitment/job-postings/[id]
// @desc    Update a job posting
// @access  Private (edit-job-postings)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'edit-job-postings');
    if (!isValidId(id)) return badRequest('Invalid job posting id');

    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, JOB_POSTING_RULES);
    errors.push(...jobPostingPostErrors(data));
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    await connectDB();
    const existing = await JobPosting.findById(id).lean();
    if (!existing) return notFound('Job posting not found');

    const cleaned = cleanJobPostingPayload(data, existing);
    delete cleaned.created_by;

    const refErrorItem = await jobPostingRefErrors(cleaned);
    if (refErrorItem) return badRequest(refErrorItem);

    if (cleaned.job_code && cleaned.job_code !== existing.job_code) {
      if (await JobPosting.exists({ job_code: cleaned.job_code, _id: { $ne: id } })) {
        return Response.json({ message: 'Job code already exists' }, { status: 409 });
      }
    } else if (!cleaned.job_code) {
      cleaned.job_code = existing.job_code;
    }

    const jobPosting = await JobPosting.findByIdAndUpdate(id, { $set: cleaned }, { new: true, runValidators: true })
      .populate(POPULATE)
      .lean();

    return Response.json({ message: 'Job posting updated successfully', jobPosting }, { status: 200 });
  } catch (error) {
    if (error?.code === 11000) return Response.json({ message: 'Job code already exists' }, { status: 409 });
    return handleApiError(error, 'Server error updating job posting');
  }
}

// @route   DELETE /api/recruitment/job-postings/[id]
// @desc    Delete a job posting (blocked while candidates are attached)
// @access  Private (delete-job-postings)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'delete-job-postings');
    if (!isValidId(id)) return badRequest('Invalid job posting id');
    await connectDB();

    if (!(await JobPosting.exists({ _id: id }))) return notFound('Job posting not found');

    const candidates = await Candidate.countDocuments({ job_id: id });
    if (candidates > 0) {
      return Response.json(
        { message: 'Cannot delete: this job posting has candidates attached' },
        { status: 409 }
      );
    }

    await JobPosting.findByIdAndDelete(id);
    return Response.json({ message: 'Job posting deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting job posting');
  }
}
