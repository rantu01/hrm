import OnboardingChecklist from '@/lib/models/OnboardingChecklist';
import CandidateOnboarding from '@/lib/models/CandidateOnboarding';
import ChecklistItem from '@/lib/models/ChecklistItem';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: OnboardingChecklist,
  permission: 'onboarding-checklists',
  entityKey: 'onboardingChecklists',
  itemKey: 'onboardingChecklist',
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
  transform: (data) => {
    if ('is_default' in data) data.is_default = Boolean(data.is_default);
    return data;
  },
  blockers: [
    {
      Model: CandidateOnboarding,
      field: 'checklist_id',
      message: 'Cannot delete: this checklist is used in onboarding processes',
    },
  ],
  afterDelete: async (doc) => {
    await ChecklistItem.deleteMany({ checklist_id: doc._id });
  },
});

// @route   GET /api/recruitment/onboarding-checklists
// @desc    List onboarding checklists (search / status / sort / pagination)
// @access  Private (view-onboarding-checklists)
export const GET = handlers.list;

// @route   POST /api/recruitment/onboarding-checklists
// @desc    Create an onboarding checklist
// @access  Private (create-onboarding-checklists)
export const POST = handlers.create;
