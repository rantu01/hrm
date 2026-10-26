import ChecklistItem from '@/lib/models/ChecklistItem';
import OnboardingChecklist from '@/lib/models/OnboardingChecklist';
import { CHECKLIST_CATEGORIES } from '@/lib/recruitment';
import { makeLookupHandlers, isValidId, toObjectIdOrNull } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: ChecklistItem,
  permission: 'checklist-items',
  entityKey: 'checklistItems',
  itemKey: 'checklistItem',
  searchFields: ['task_name', 'description'],
  sortMap: {
    due_day: 'due_day',
    category: 'category',
    created_at: 'createdAt',
    createdAt: 'createdAt',
    id: '_id',
    _id: '_id',
  },
  populate: [{ path: 'checklist_id', select: 'name' }],
  validate: [
    {
      field: 'task_name',
      required: true,
      trim: true,
      maxLength: 255,
      messages: { required: 'Task name is required' },
    },
    { field: 'description', optional: true, trim: true },
    {
      field: 'category',
      optional: true,
      isIn: CHECKLIST_CATEGORIES,
      messages: { isIn: 'Category is invalid' },
    },
    { field: 'assigned_to_role', optional: true, trim: true },
    { field: 'due_day', optional: true, isNumeric: true, messages: { isNumeric: 'Due day must be a number' } },
    { field: 'is_required', optional: true },
    {
      field: 'status',
      optional: true,
      isIn: ['active', 'inactive'],
      messages: { isIn: 'Status is invalid' },
    },
  ],
  extraFilter: async (sp) => {
    const raw = sp.get('checklist_id');
    if (!raw || raw === 'all') return {};
    const id = toObjectIdOrNull(raw);
    return id ? { checklist_id: id } : { checklist_id: { $in: [] } };
  },
  transform: (data) => {
    if ('due_day' in data) data.due_day = Number(data.due_day);
    if ('is_required' in data) data.is_required = Boolean(data.is_required);
    return data;
  },
  dependencies: async (data) => {
    if (!data.checklist_id) return 'Checklist is required';
    if (!isValidId(String(data.checklist_id))) return 'Invalid checklist selected';
    const checklist = await OnboardingChecklist.exists({ _id: data.checklist_id });
    if (!checklist) return 'Invalid checklist selected';
    if (data.due_day !== undefined && data.due_day < 1) return 'Due day must be at least 1';
    return null;
  },
});

// @route   GET /api/recruitment/checklist-items
// @desc    List checklist items (search / checklist / sort / pagination)
// @access  Private (view-checklist-items)
export const GET = handlers.list;

// @route   POST /api/recruitment/checklist-items
// @desc    Create a checklist item
// @access  Private (create-checklist-items)
export const POST = handlers.create;
