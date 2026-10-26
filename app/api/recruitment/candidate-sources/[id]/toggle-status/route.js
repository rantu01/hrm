import CandidateSource from '@/lib/models/CandidateSource';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: CandidateSource,
  permission: 'candidate-sources',
  entityKey: 'candidateSources',
  itemKey: 'candidateSource',
});

// @route   PATCH /api/recruitment/candidate-sources/[id]/toggle-status
// @desc    Flip a candidate source between active / inactive
// @access  Private (edit-candidate-sources)
export async function PATCH(request, { params }) {
  const { id } = await params;
  return handlers.toggle(request, id);
}
