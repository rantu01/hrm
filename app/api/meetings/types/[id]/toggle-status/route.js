import MeetingType from '@/lib/models/MeetingType';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: MeetingType,
  permission: 'meeting-types',
  entityKey: 'meetingTypes',
  itemKey: 'meetingType',
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  return handlers.toggle(request, id);
}
