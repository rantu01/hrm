import connectDB from '@/lib/db';
import Meeting from '@/lib/models/Meeting';
import MeetingType from '@/lib/models/MeetingType';
import MeetingRoom from '@/lib/models/MeetingRoom';
import User from '@/lib/models/User';
import { authorizeRecruitment as authorize } from '@/lib/recruitment-server';
import { requireAuth } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validation';
import {
  toObjectIdOrNull,
  isValidId,
  escapeRegex,
  getPagination,
  paginationPayload,
  getSort,
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

// @route GET /api/meetings
export async function GET(request) {
  try {
    await authorize(request, 'view-meetings');
    await connectDB();
    const sp = request.nextUrl.searchParams;

    const filter = {};
    const search = (sp.get('search') || '').trim();
    if (search) {
      filter.title = { $regex: escapeRegex(search), $options: 'i' };
    }
    for (const [param, field] of [['type_id', 'type_id'], ['room_id', 'room_id'], ['organizer_id', 'organizer_id']]) {
      const v = sp.get(param);
      if (v) {
        const oid = toObjectIdOrNull(v);
        if (!oid) return badRequest(`Invalid ${param}`);
        filter[field] = oid;
      }
    }
    const status = sp.get('status');
    if (status && status !== 'all') {
      if (!MEETING_STATUSES.includes(status)) return badRequest('Invalid status selected');
      filter.status = status;
    }
    const date = sp.get('date');
    if (date) {
      const d = parseDate(date);
      if (!d) return badRequest('Invalid date');
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      filter.meeting_date = { $gte: start, $lte: end };
    }
    const from = sp.get('from');
    const to = sp.get('to');
    if (from || to) {
      const range = {};
      if (from) {
        const d = parseDate(from);
        if (!d) return badRequest('Invalid from date');
        const s = new Date(d); s.setHours(0, 0, 0, 0);
        range.$gte = s;
      }
      if (to) {
        const d = parseDate(to);
        if (!d) return badRequest('Invalid to date');
        const e = new Date(d); e.setHours(23, 59, 59, 999);
        range.$lte = e;
      }
      filter.meeting_date = { ...(filter.meeting_date || {}), ...range };
    }

    const { page, limit, skip } = getPagination(sp, 10);
    const sort = getSort(sp, {
      title: 'title',
      meeting_date: 'meeting_date',
      start_time: 'start_time',
      status: 'status',
      created_at: 'createdAt',
      createdAt: 'createdAt',
    });

    const [meetings, total, statusAgg] = await Promise.all([
      Meeting.find(filter).populate(POPULATE).sort(sort).skip(skip).limit(limit).lean(),
      Meeting.countDocuments(filter),
      Meeting.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const statusCounts = { all: 0 };
    for (const s of MEETING_STATUSES) statusCounts[s] = 0;
    for (const c of statusAgg || []) {
      if (c?._id && c._id in statusCounts) statusCounts[c._id] = c.count;
      statusCounts.all += c?.count || 0;
    }

    return Response.json(
      { meetings, statusCounts, pagination: paginationPayload(page, limit, total) },
      { status: 200 }
    );
  } catch (error) {
    return (await import('@/lib/auth')).handleApiError(error, 'Server error fetching meetings');
  }
}

// @route POST /api/meetings
export async function POST(request) {
  try {
    const user = await authorize(request, 'create-meetings');
    const body = await parseJsonBody(request);

    const title = String(body.title || '').trim();
    if (!title) return badRequest('Title is required');
    const type_id = toObjectIdOrNull(body.type_id);
    if (!type_id) return badRequest('Meeting type is required');
    const meeting_date = parseDate(body.meeting_date);
    if (!meeting_date) return badRequest('Meeting date is required');
    const start_time = String(body.start_time || '').trim();
    const end_time = String(body.end_time || '').trim();
    const startMin = timeToMinutes(start_time);
    const endMin = timeToMinutes(end_time);
    if (startMin === null) return badRequest('Start time is required');
    if (endMin === null) return badRequest('End time is required');
    if (endMin <= startMin) return badRequest('End time must be after start time');
    const duration = endMin - startMin;

    const room_id = body.room_id ? toObjectIdOrNull(body.room_id) : null;
    if (body.room_id && !room_id) return badRequest('Invalid room');

    const organizer_id = body.organizer_id ? toObjectIdOrNull(body.organizer_id) : user._id;
    if (!organizer_id) return badRequest('Organizer is required');

    const recurrence = body.recurrence && MEETING_RECURRENCE.includes(body.recurrence) ? body.recurrence : 'None';
    const recurrence_end_date = body.recurrence_end_date ? parseDate(body.recurrence_end_date) : null;

    await connectDB();
    const typeDoc = await MeetingType.findById(type_id).lean();
    if (!typeDoc) return badRequest('Meeting type not found');

    const baseData = {
      title,
      description: body.description ? String(body.description).trim() : null,
      type_id,
      room_id,
      start_time,
      end_time,
      duration,
      agenda: body.agenda ? String(body.agenda).trim() : null,
      status: 'Scheduled',
      recurrence,
      recurrence_end_date,
      organizer_id,
      created_by: user._id,
    };

    // Recurring creation
    const meetings = [];
    const firstDate = new Date(meeting_date);
    firstDate.setHours(0, 0, 0, 0);
    baseData.meeting_date = firstDate;
    meetings.push(await Meeting.create(baseData));

    if (recurrence !== 'None' && recurrence_end_date) {
      let current = new Date(firstDate);
      const end = new Date(recurrence_end_date);
      end.setHours(0, 0, 0, 0);
      while (current < end) {
        if (recurrence === 'Daily') current.setDate(current.getDate() + 1);
        else if (recurrence === 'Weekly') current.setDate(current.getDate() + 7);
        else if (recurrence === 'Monthly') current.setMonth(current.getMonth() + 1);
        if (current <= end) {
          const d = new Date(current);
          d.setHours(0, 0, 0, 0);
          meetings.push(await Meeting.create({ ...baseData, meeting_date: d }));
        }
      }
    }

    const meeting = await Meeting.findById(meetings[0]._id).populate(POPULATE).lean();
    return Response.json(
      { message: 'Meeting created successfully', meeting, count: meetings.length },
      { status: 201 }
    );
  } catch (error) {
    return (await import('@/lib/auth')).handleApiError(error, 'Server error creating meeting');
  }
}
