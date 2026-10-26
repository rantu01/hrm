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

// @route   PUT /api/recruitment/onboarding-checklists/[id]
// @desc    Update an onboarding checklist
// @access  Private (edit-onboarding-checklists)
export async function PUT(request, { params }) {
  const { id } = await params;
  return handlers.update(request, id);
}

// @route   DELETE /api/recruitment/onboarding-checklists/[id]
// @desc    Delete an onboarding checklist (cascades its checklist items)
// @access  Private (delete-onboarding-checklists)
export async function DELETE(request, { params }) {
  const { id } = await params;
  return handlers.destroy(request, id);
}
