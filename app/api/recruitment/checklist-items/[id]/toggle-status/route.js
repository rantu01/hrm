import ChecklistItem from '@/lib/models/ChecklistItem';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: ChecklistItem,
  permission: 'checklist-items',
  entityKey: 'checklistItems',
  itemKey: 'checklistItem',
});

// @route   PATCH /api/recruitment/checklist-items/[id]/toggle-status
// @desc    Flip a checklist item between active / inactive
// @access  Private (edit-checklist-items)
export async function PATCH(request, { params }) {
  const { id } = await params;
  return handlers.toggle(request, id);
}
