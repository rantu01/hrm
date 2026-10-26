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

// @route   PUT /api/recruitment/custom-questions/[id]
// @desc    Update a custom question
// @access  Private (edit-custom-questions)
export async function PUT(request, { params }) {
  const { id } = await params;
  return handlers.update(request, id);
}

// @route   DELETE /api/recruitment/custom-questions/[id]
// @desc    Delete a custom question (blocked while job postings use it)
// @access  Private (delete-custom-questions)
export async function DELETE(request, { params }) {
  const { id } = await params;
  return handlers.destroy(request, id);
}
