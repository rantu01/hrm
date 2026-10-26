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

// @route   GET /api/recruitment/candidate-sources
// @desc    List candidate sources (search / status / sort / pagination)
// @access  Private (view-candidate-sources)
export const GET = handlers.list;

// @route   POST /api/recruitment/candidate-sources
// @desc    Create a candidate source
// @access  Private (create-candidate-sources)
export const POST = handlers.create;
