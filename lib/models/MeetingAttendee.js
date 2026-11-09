import mongoose from 'mongoose';

const meetingAttendeeSchema = new mongoose.Schema(
  {
    meeting_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Required', 'Optional'], default: 'Required' },
    rsvp_status: { type: String, enum: ['Pending', 'Accepted', 'Declined', 'Tentative'], default: 'Pending' },
    attendance_status: { type: String, enum: ['Not Attended', 'Present', 'Late', 'Left Early'], default: 'Not Attended' },
    rsvp_date: { type: Date, default: null },
    decline_reason: { type: String, trim: true, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

meetingAttendeeSchema.index({ meeting_id: 1, user_id: 1 }, { unique: true });

export default mongoose.models.MeetingAttendee || mongoose.model('MeetingAttendee', meetingAttendeeSchema);