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

// @route   GET /api/recruitment/job-categories
// @desc    List job categories (search / status / sort / pagination)
// @access  Private (view-job-categories)
export const GET = handlers.list;

// @route   POST /api/recruitment/job-categories
// @desc    Create a job category
// @access  Private (create-job-categories)
export const POST = handlers.create;
