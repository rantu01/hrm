import mongoose from 'mongoose';

const actionItemSchema = new mongoose.Schema(
  {
    meeting_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: null },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    due_date: { type: Date, required: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    status: { type: String, enum: ['Not Started', 'In Progress', 'Completed', 'Overdue'], default: 'Not Started' },
    progress_percentage: { type: Number, default: 0, min: 0, max: 100 },
    notes: { type: String, trim: true, default: null },
    completed_date: { type: Date, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.models.ActionItem || mongoose.model('ActionItem', actionItemSchema);