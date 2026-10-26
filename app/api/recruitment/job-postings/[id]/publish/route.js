import connectDB from '@/lib/db';
import JobPosting from '@/lib/models/JobPosting';
import { handleApiError } from '@/lib/auth';
import { authorizeRecruitment, isValidId, badRequest, notFound } from '@/lib/recruitment-server';

// @route   PATCH /api/recruitment/job-postings/[id]/publish
// @desc    Publish a job posting
// @access  Private (publish-job-postings)
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'publish-job-postings');
    if (!isValidId(id)) return badRequest('Invalid job posting id');
    await connectDB();

    if (!(await JobPosting.exists({ _id: id }))) return notFound('Job posting not found');

    const jobPosting = await JobPosting.findByIdAndUpdate(
      id,
      { $set: { is_published: true, publish_date: new Date(), status: 'Published' } },
      { new: true, runValidators: true }
    )
      .populate('job_type_id', 'name')
      .populate('location_id', 'name city is_remote')
      .populate('department_id', 'name')
      .lean();

    return Response.json({ message: 'Job posting published successfully', jobPosting }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error publishing job posting');
  }
}
