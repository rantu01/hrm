import InterviewType from '@/lib/models/InterviewType';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: InterviewType,
  permission: 'interview-types',
  entityKey: 'interviewTypes',
  itemKey: 'interviewType',
});

// @route   PATCH /api/recruitment/interview-types/[id]/toggle-status
// @desc    Flip an interview type between active / inactive
// @access  Private (edit-interview-types)
export async function PATCH(request, { params }) {
  const { id } = await params;
  return handlers.toggle(request, id);
}
