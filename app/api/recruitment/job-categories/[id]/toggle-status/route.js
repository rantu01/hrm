import JobCategory from '@/lib/models/JobCategory';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: JobCategory,
  permission: 'job-categories',
  entityKey: 'jobCategories',
  itemKey: 'jobCategory',
});

// @route   PATCH /api/recruitment/job-categories/[id]/toggle-status
// @desc    Flip a job category between active / inactive
// @access  Private (edit-job-categories)
export async function PATCH(request, { params }) {
  const { id } = await params;
  return handlers.toggle(request, id);
}
