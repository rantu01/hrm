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

// @route   GET /api/recruitment/job-types
// @desc    List job types (search / status / sort / pagination)
// @access  Private (view-job-types)
export const GET = handlers.list;

// @route   POST /api/recruitment/job-types
// @desc    Create a job type
// @access  Private (create-job-types)
export const POST = handlers.create;
