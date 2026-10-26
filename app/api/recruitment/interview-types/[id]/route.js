import InterviewType from '@/lib/models/InterviewType';
import Interview from '@/lib/models/Interview';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: InterviewType,
  permission: 'interview-types',
  entityKey: 'interviewTypes',
  itemKey: 'interviewType',
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
      Model: Interview,
      field: 'interview_type_id',
      message: 'Cannot delete: this interview type is used by interviews',
    },
  ],
});

// @route   PUT /api/recruitment/interview-types/[id]
// @desc    Update an interview type
// @access  Private (edit-interview-types)
export async function PUT(request, { params }) {
  const { id } = await params;
  return handlers.update(request, id);
}

// @route   DELETE /api/recruitment/interview-types/[id]
// @desc    Delete an interview type (blocked while interviews use it)
// @access  Private (delete-interview-types)
export async function DELETE(request, { params }) {
  const { id } = await params;
  return handlers.destroy(request, id);
}
