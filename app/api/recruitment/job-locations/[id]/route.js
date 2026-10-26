import JobLocation from '@/lib/models/JobLocation';
import JobPosting from '@/lib/models/JobPosting';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: JobLocation,
  permission: 'job-locations',
  entityKey: 'jobLocations',
  itemKey: 'jobLocation',
  searchFields: ['name', 'address', 'city', 'state', 'country'],
  sortMap: {
    name: 'name',
    city: 'city',
    created_at: 'createdAt',
    createdAt: 'createdAt',
    id: '_id',
    _id: '_id',
  },
  validate: [
    { field: 'name', required: true, trim: true, maxLength: 255, messages: { required: 'Name is required' } },
    { field: 'address', optional: true, trim: true },
    { field: 'city', optional: true, trim: true, maxLength: 255 },
    { field: 'state', optional: true, trim: true, maxLength: 255 },
    { field: 'country', optional: true, trim: true, maxLength: 255 },
    { field: 'postal_code', optional: true, trim: true, maxLength: 20 },
    {
      field: 'status',
      optional: true,
      isIn: ['active', 'inactive'],
      messages: { isIn: 'Status is invalid' },
    },
  ],
  transform: (data) => {
    if ('is_remote' in data) data.is_remote = Boolean(data.is_remote);
    return data;
  },
  blockers: [
    {
      Model: JobPosting,
      field: 'location_id',
      message: 'Cannot delete: this job location is used by job postings',
    },
  ],
});

// @route   PUT /api/recruitment/job-locations/[id]
// @desc    Update a job location
// @access  Private (edit-job-locations)
export async function PUT(request, { params }) {
  const { id } = await params;
  return handlers.update(request, id);
}

// @route   DELETE /api/recruitment/job-locations/[id]
// @desc    Delete a job location (blocked while job postings use it)
// @access  Private (delete-job-locations)
export async function DELETE(request, { params }) {
  const { id } = await params;
  return handlers.destroy(request, id);
}
