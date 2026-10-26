import mongoose from 'mongoose';

export const CHECKLIST_CATEGORIES = ['Documentation', 'IT Setup', 'Training', 'HR', 'Facilities', 'Other'];

const checklistItemSchema = new mongoose.Schema(
  {
    checklist_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OnboardingChecklist',
      required: [true, 'Checklist is required'],
    },
    task_name: {
      type: String,
      required: [true, 'Task name is required'],
      trim: true,
      maxlength: [255, 'Task name cannot exceed 255 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    category: {
      type: String,
      enum: CHECKLIST_CATEGORIES,
      default: 'Other',
    },
    assigned_to_role: {
      type: String,
      trim: true,
      default: null,
      maxlength: [255, 'Assigned role cannot exceed 255 characters'],
    },
    due_day: {
      type: Number,
      default: 1,
      min: [1, 'Due day must be at least 1'],
    },
    is_required: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ChecklistItem || mongoose.model('ChecklistItem', checklistItemSchema);
