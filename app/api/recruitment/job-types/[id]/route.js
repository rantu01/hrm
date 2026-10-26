import JobType from '@/lib/models/JobType';
import JobPosting from '@/lib/models/JobPosting';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: JobType,
  permission: 'job-types',
  entityKey: 'jobTypes',
  itemKey: 'jobType',
  searchFields: ['name', 'description'],
  sortMap: {
    name: 'name',
    created_at: 'createdAt',
    createdAt: 'createdAt',
    id: '_id',
    _id: '_id',
  },
  validate: [
    { field: 'name', required: true, trim: true, maxLength: 255, messages: { required: 'Name is required' } },
    { field: 'description', optional: true, trim: true },
    {
      field: 'status',
      optional: true,
      isIn: ['active', 'inactive'],
      messages: { isIn: 'Status is invalid' },
    },
  ],
  blockers: [
    {
      Model: JobPosting,
      field: 'job_type_id',
      message: 'Cannot delete: this job type is used by job postings',
    },
  ],
});

// @route   PUT /api/recruitment/job-types/[id]
// @desc    Update a job type
// @access  Private (edit-job-types)
export async function PUT(request, { params }) {
  const { id } = await params;
  return handlers.update(request, id);
}

// @route   DELETE /api/recruitment/job-types/[id]
// @desc    Delete a job type (blocked while job postings use it)
// @access  Private (delete-job-types)
export async function DELETE(request, { params }) {
  const { id } = await params;
  return handlers.destroy(request, id);
}
