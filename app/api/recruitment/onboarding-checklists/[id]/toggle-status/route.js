import OnboardingChecklist from '@/lib/models/OnboardingChecklist';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: OnboardingChecklist,
  permission: 'onboarding-checklists',
  entityKey: 'onboardingChecklists',
  itemKey: 'onboardingChecklist',
});

// @route   PATCH /api/recruitment/onboarding-checklists/[id]/toggle-status
// @desc    Flip an onboarding checklist between active / inactive
// @access  Private (edit-onboarding-checklists)
export async function PATCH(request, { params }) {
  const { id } = await params;
  return handlers.toggle(request, id);
}
