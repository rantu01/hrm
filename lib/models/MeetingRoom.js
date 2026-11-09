import mongoose from 'mongoose';

const meetingRoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: null },
    type: { type: String, enum: ['Physical', 'Virtual'], default: 'Physical' },
    location: { type: String, trim: true, default: null },
    capacity: { type: Number, required: true, min: 1 },
    equipment: { type: [String], default: [] },
    booking_url: { type: String, trim: true, default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export default mongoose.models.MeetingRoom || mongoose.model('MeetingRoom', meetingRoomSchema);