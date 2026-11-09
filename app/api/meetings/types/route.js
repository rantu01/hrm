import MeetingType from '@/lib/models/MeetingType';
import Meeting from '@/lib/models/Meeting';
import { makeLookupHandlers } from '@/lib/recruitment-server';

const handlers = makeLookupHandlers({
  Model: MeetingType,
  permission: 'meeting-types',
  entityKey: 'meetingTypes',
  itemKey: 'meetingType',
  searchFields: ['name', 'description'],
  sortMap: {
    name: 'name',
    created_at: 'createdAt',
    createdAt: 'createdAt',
    id: '_id',
    _id: '_id',
  },
  validate: [
    { field: 'name', required: true, trim: true, maxLength: 255, messages: { required: 'Name is required' } },
    { field: 'description', optional: true, trim: true },
    { field: 'color', optional: true, trim: true },
    { field: 'default_duration', optional: true, isNumeric: true, messages: { isNumeric: 'Duration must be a number' } },
    { field: 'status', optional: true, isIn: ['active', 'inactive'], messages: { isIn: 'Status is invalid' } },
  ],
  blockers: [
    { Model: Meeting, field: 'type_id', message: 'Cannot delete: this meeting type is used by meetings' },
  ],
});

export const GET = handlers.list;
export const POST = handlers.create;
