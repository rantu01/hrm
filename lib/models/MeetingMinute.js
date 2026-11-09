import mongoose from 'mongoose';

const meetingMinuteSchema = new mongoose.Schema(
  {
    meeting_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
    topic: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    type: { type: String, enum: ['Discussion', 'Decision', 'Action Item', 'Note'], default: 'Discussion' },
    recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recorded_at: { type: Date, required: true, default: Date.now },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.models.MeetingMinute || mongoose.model('MeetingMinute', meetingMinuteSchema);