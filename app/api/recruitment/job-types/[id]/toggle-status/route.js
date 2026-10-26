import JobType from '@/lib/models/JobType';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: JobType,
  permission: 'job-types',
  entityKey: 'jobTypes',
  itemKey: 'jobType',
});

// @route   PATCH /api/recruitment/job-types/[id]/toggle-status
// @desc    Flip a job type between active / inactive
// @access  Private (edit-job-types)
export async function PATCH(request, { params }) {
  const { id } = await params;
  return handlers.toggle(request, id);
}
