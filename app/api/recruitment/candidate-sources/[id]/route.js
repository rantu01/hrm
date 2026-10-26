import CandidateSource from '@/lib/models/CandidateSource';
import Candidate from '@/lib/models/Candidate';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: CandidateSource,
  permission: 'candidate-sources',
  entityKey: 'candidateSources',
  itemKey: 'candidateSource',
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
      Model: Candidate,
      field: 'source_id',
      message: 'Cannot delete: this candidate source is used by candidates',
    },
  ],
});

// @route   PUT /api/recruitment/candidate-sources/[id]
// @desc    Update a candidate source
// @access  Private (edit-candidate-sources)
export async function PUT(request, { params }) {
  const { id } = await params;
  return handlers.update(request, id);
}

// @route   DELETE /api/recruitment/candidate-sources/[id]
// @desc    Delete a candidate source (blocked while candidates use it)
// @access  Private (delete-candidate-sources)
export async function DELETE(request, { params }) {
  const { id } = await params;
  return handlers.destroy(request, id);
}
