import CustomQuestion from '@/lib/models/CustomQuestion';
import JobPosting from '@/lib/models/JobPosting';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: CustomQuestion,
  permission: 'custom-questions',
  entityKey: 'customQuestions',
  itemKey: 'customQuestion',
  searchFields: ['question'],
  sortMap: {
    created_at: 'createdAt',
    createdAt: 'createdAt',
    id: '_id',
    _id: '_id',
  },
  statusValues: null,
  validate: [
    { field: 'question', required: true, trim: true, messages: { required: 'Question is required' } },
    { field: 'required', optional: true },
  ],
  transform: (data) => {
    data.required =
      data.required === true || data.required === 1 || data.required === '1' || data.required === 'true' ? 1 : 0;
    return data;
  },
  blockers: [
    {
      Model: JobPosting,
      field: 'custom_question',
      message: 'Cannot delete: this question is used by job postings',
    },
  ],
});

// @route   GET /api/recruitment/custom-questions
// @desc    List custom questions (search / sort / pagination)
// @access  Private (view-custom-questions)
export const GET = handlers.list;

// @route   POST /api/recruitment/custom-questions
// @desc    Create a custom question
// @access  Private (create-custom-questions)
export const POST = handlers.create;
