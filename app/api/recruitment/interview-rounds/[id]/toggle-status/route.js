import InterviewRound from '@/lib/models/InterviewRound';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: InterviewRound,
  permission: 'interview-rounds',
  entityKey: 'interviewRounds',
  itemKey: 'interviewRound',
});

// @route   PATCH /api/recruitment/interview-rounds/[id]/toggle-status
// @desc    Flip an interview round between active / inactive
// @access  Private (edit-interview-rounds)
export async function PATCH(request, { params }) {
  const { id } = await params;
  return handlers.toggle(request, id);
}
