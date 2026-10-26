import InterviewRound from '@/lib/models/InterviewRound';
import JobPosting from '@/lib/models/JobPosting';
import Interview from '@/lib/models/Interview';
import {
  makeLookupHandlers,
  isValidId,
  toObjectIdOrNull,
} from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: InterviewRound,
  permission: 'interview-rounds',
  entityKey: 'interviewRounds',
  itemKey: 'interviewRound',
  searchFields: ['name', 'description'],
  sortMap: {
    sequence_number: 'sequence_number',
    name: 'name',
    created_at: 'createdAt',
    createdAt: 'createdAt',
    id: '_id',
    _id: '_id',
  },
  populate: [{ path: 'job_id', select: 'title job_code' }],
  validate: [
    { field: 'name', required: true, trim: true, maxLength: 255, messages: { required: 'Name is required' } },
    {
      field: 'sequence_number',
      required: true,
      isNumeric: true,
      messages: { required: 'Sequence number is required', isNumeric: 'Sequence number must be a number' },
    },
    { field: 'description', optional: true, trim: true },
    {
      field: 'status',
      optional: true,
      isIn: ['active', 'inactive'],
      messages: { isIn: 'Status is invalid' },
    },
  ],
  extraFilter: async (sp) => {
    const raw = sp.get('job_id');
    if (!raw || raw === 'all') return {};
    const id = toObjectIdOrNull(raw);
    return id ? { job_id: id } : { job_id: { $in: [] } };
  },
  transform: (data) => {
    if ('sequence_number' in data) data.sequence_number = Number(data.sequence_number);
    return data;
  },
  dependencies: async (data) => {
    if (!data.job_id) return 'Job posting is required';
    if (!isValidId(String(data.job_id))) return 'Invalid job posting selected';
    const job = await JobPosting.exists({ _id: data.job_id });
    if (!job) return 'Invalid job posting selected';
    if (data.sequence_number !== undefined && data.sequence_number < 1) {
      return 'Sequence number must be at least 1';
    }
    return null;
  },
  blockers: [
    {
      Model: Interview,
      field: 'round_id',
      message: 'Cannot delete: this interview round is used by interviews',
    },
  ],
});

// @route   GET /api/recruitment/interview-rounds
// @desc    List interview rounds (search / job / sort / pagination)
// @access  Private (view-interview-rounds)
export const GET = handlers.list;

// @route   POST /api/recruitment/interview-rounds
// @desc    Create an interview round
// @access  Private (create-interview-rounds)
export const POST = handlers.create;
