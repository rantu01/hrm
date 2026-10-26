import JobCategory from '@/lib/models/JobCategory';
import JobPosting from '@/lib/models/JobPosting';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: JobCategory,
  permission: 'job-categories',
  entityKey: 'jobCategories',
  itemKey: 'jobCategory',
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
      field: 'category_id',
      message: 'Cannot delete: this job category is used by job postings',
    },
  ],
});

// @route   PUT /api/recruitment/job-categories/[id]
// @desc    Update a job category
// @access  Private (edit-job-categories)
export async function PUT(request, { params }) {
  const { id } = await params;
  return handlers.update(request, id);
}

// @route   DELETE /api/recruitment/job-categories/[id]
// @desc    Delete a job category (blocked while job postings use it)
// @access  Private (delete-job-categories)
export async function DELETE(request, { params }) {
  const { id } = await params;
  return handlers.destroy(request, id);
}
