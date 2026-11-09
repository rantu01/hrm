import mongoose from 'mongoose';

const MEETING_STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
const MEETING_RECURRENCE = ['None', 'Daily', 'Weekly', 'Monthly'];

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: null },
    type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MeetingType', required: true },
    room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MeetingRoom', default: null },
    meeting_date: { type: Date, required: true },
    start_time: { type: String, required: true, trim: true },
    end_time: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 1 },
    agenda: { type: String, trim: true, default: null },
    status: { type: String, enum: MEETING_STATUSES, default: 'Scheduled' },
    recurrence: { type: String, enum: MEETING_RECURRENCE, default: 'None' },
    recurrence_end_date: { type: Date, default: null },
    organizer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

meetingSchema.index({ meeting_date: 1 });
meetingSchema.index({ organizer_id: 1 });
meetingSchema.index({ type_id: 1 });

export { MEETING_STATUSES, MEETING_RECURRENCE };
export default mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema);