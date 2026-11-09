import MeetingRoom from '@/lib/models/MeetingRoom';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: MeetingRoom,
  permission: 'meeting-rooms',
  entityKey: 'meetingRooms',
  itemKey: 'meetingRoom',
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  return handlers.toggle(request, id);
}
