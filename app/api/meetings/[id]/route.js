import connectDB from '@/lib/db';
import Meeting from '@/lib/models/Meeting';
import MeetingType from '@/lib/models/MeetingType';
import MeetingRoom from '@/lib/models/MeetingRoom';
import MeetingAttendee from '@/lib/models/MeetingAttendee';
import MeetingMinute from '@/lib/models/MeetingMinute';
import ActionItem from '@/lib/models/ActionItem';
import { authorizeRecruitment as authorize } from '@/lib/recruitment-server';
import { handleApiError, parseJsonBody } from '@/lib/auth';
import { parseJsonBody as parseBody } from '@/lib/validation';
import {
  toObjectIdOrNull,
  isValidId,
  escapeRegex,
  badRequest,
  notFound,
} from '@/lib/recruitment-server';
import { MEETING_STATUSES, MEETING_RECURRENCE } from '@/lib/models/Meeting';

const POPULATE = [
  { path: 'type_id', select: 'name color default_duration' },
  { path: 'room_id', select: 'name type location' },
  { path: 'organizer_id', select: 'name email' },
];

function timeToMinutes(t) {
  const m = String(t).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request, { params }) {
  try {
    await authorize(request, 'view-meetings');
    const { id } = await params;
    if (!isValidId(id)) return badRequest('Invalid meeting id');
    await connectDB();
    const meeting = await Meeting.findById(id).populate(POPULATE).lean();
    if (!meeting) return notFound('Meeting not found');
    return Response.json({ meeting }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching meeting');
  }
}

export async function PUT(request, { params }) {
  try {
    await authorize(request, 'edit-meetings');
    const { id } = await params;
    if (!isValidId(id)) return badRequest('Invalid meeting id');
    const body = await parseBody(request);

    await connectDB();
    const existing = await Meeting.findById(id);
    if (!existing) return notFound('Meeting not found');

    const title = body.title !== undefined ? String(body.title).trim() : existing.title;
    if (!title) return badRequest('Title is required');

    const type_id = body.type_id !== undefined ? toObjectIdOrNull(body.type_id) : existing.type_id;
    if (!type_id) return badRequest('Meeting type is required');

    const meeting_date = body.meeting_date !== undefined ? parseDate(body.meeting_date) : existing.meeting_date;
    if (!meeting_date) return badRequest('Meeting date is required');

    const start_time = body.start_time !== undefined ? String(body.start_time).trim() : existing.start_time;
    const end_time = body.end_time !== undefined ? String(body.end_time).trim() : existing.end_time;
    const startMin = timeToMinutes(start_time);
    const endMin = timeToMinutes(end_time);
    if (startMin === null || endMin === null) return badRequest('Invalid time');
    if (endMin <= startMin) return badRequest('End time must be after start time');
    const duration = endMin - startMin;

    const room_id = body.room_id !== undefined
      ? (body.room_id ? toObjectIdOrNull(body.room_id) : null)
      : existing.room_id;

    const organizer_id = body.organizer_id !== undefined
      ? toObjectIdOrNull(body.organizer_id)
      : existing.organizer_id;
    if (!organizer_id) return badRequest('Organizer is required');

    const recurrence = body.recurrence !== undefined && MEETING_RECURRENCE.includes(body.recurrence)
      ? body.recurrence
      : existing.recurrence;
    const recurrence_end_date = body.recurrence_end_date !== undefined
      ? (body.recurrence_end_date ? parseDate(body.recurrence_end_date) : null)
      : existing.recurrence_end_date;

    existing.set({
      title,
      description: body.description !== undefined ? (body.description ? String(body.description).trim() : null) : existing.description,
      type_id,
      room_id,
      meeting_date,
      start_time,
      end_time,
      duration,
      agenda: body.agenda !== undefined ? (body.agenda ? String(body.agenda).trim() : null) : existing.agenda,
      recurrence,
      recurrence_end_date,
      organizer_id,
    });
    if (body.status !== undefined && MEETING_STATUSES.includes(body.status)) existing.status = body.status;
    await existing.save();

    const meeting = await Meeting.findById(id).populate(POPULATE).lean();
    return Response.json({ message: 'Meeting updated successfully', meeting }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating meeting');
  }
}

export async function DELETE(request, { params }) {
  try {
    await authorize(request, 'delete-meetings');
    const { id } = await params;
    if (!isValidId(id)) return badRequest('Invalid meeting id');
    await connectDB();
    const existing = await Meeting.findById(id).lean();
    if (!existing) return notFound('Meeting not found');
    await Meeting.findByIdAndDelete(id);
    await MeetingAttendee.deleteMany({ meeting_id: id });
    await MeetingMinute.deleteMany({ meeting_id: id });
    await ActionItem.deleteMany({ meeting_id: id });
    return Response.json({ message: 'Meeting deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting meeting');
  }
}
