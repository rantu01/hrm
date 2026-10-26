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

// @route   GET /api/recruitment/interview-types
// @desc    List interview types (search / status / sort / pagination)
// @access  Private (view-interview-types)
export const GET = handlers.list;

// @route   POST /api/recruitment/interview-types
// @desc    Create an interview type
// @access  Private (create-interview-types)
export const POST = handlers.create;
