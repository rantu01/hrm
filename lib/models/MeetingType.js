import mongoose from 'mongoose';

const meetingTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: null },
    color: { type: String, trim: true, default: '#3B82F6' },
    default_duration: { type: Number, default: 60, min: 15, max: 480 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.models.MeetingType || mongoose.model('MeetingType', meetingTypeSchema);