import JobLocation from '@/lib/models/JobLocation';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: JobLocation,
  permission: 'job-locations',
  entityKey: 'jobLocations',
  itemKey: 'jobLocation',
});

// @route   PATCH /api/recruitment/job-locations/[id]/toggle-status
// @desc    Flip a job location between active / inactive
// @access  Private (edit-job-locations)
export async function PATCH(request, { params }) {
  const { id } = await params;
  return handlers.toggle(request, id);
}
