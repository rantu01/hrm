import MeetingRoom from '@/lib/models/MeetingRoom';
import Meeting from '@/lib/models/Meeting';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: MeetingRoom,
  permission: 'meeting-rooms',
  entityKey: 'meetingRooms',
  itemKey: 'meetingRoom',
  searchFields: ['name', 'description', 'location'],
  sortMap: { name: 'name', created_at: 'createdAt', createdAt: 'createdAt', id: '_id', _id: '_id' },
  validate: [
    { field: 'name', required: true, trim: true, maxLength: 255, messages: { required: 'Name is required' } },
    { field: 'description', optional: true, trim: true },
    { field: 'type', optional: true, isIn: ['Physical', 'Virtual'] },
    { field: 'location', optional: true, trim: true },
    { field: 'capacity', optional: true, isNumeric: true },
    { field: 'booking_url', optional: true, trim: true },
    { field: 'status', optional: true, isIn: ['active', 'inactive'] },
  ],
  blockers: [{ Model: Meeting, field: 'room_id', message: 'Cannot delete: this meeting room is used by meetings' }],
});

export async function PUT(request, { params }) {
  const { id } = await params;
  return handlers.update(request, id);
}
export async function DELETE(request, { params }) {
  const { id } = await params;
  return handlers.destroy(request, id);
}
