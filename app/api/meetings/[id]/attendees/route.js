import connectDB from '@/lib/db';
import Meeting from '@/lib/models/Meeting';
import MeetingAttendee from '@/lib/models/MeetingAttendee';
import User from '@/lib/models/User';
import { authorizeRecruitment as authorize } from '@/lib/recruitment-server';
import { handleApiError, parseJsonBody } from '@/lib/auth';
import { parseJsonBody as parseBody } from '@/lib/validation';
import {
  toObjectIdOrNull,
  isValidId,
  escapeRegex,
  getPagination,
  paginationPayload,
  badRequest,
  notFound,
} from '@/lib/recruitment-server';

const POPULATE = [{ path: 'user_id', select: 'name email' }];

export async function GET(request, { params }) {
  try {
    await authorize(request, 'view-meeting-attendees');
    const { id } = await params;
    if (!isValidId(id)) return badRequest('Invalid meeting id');
    await connectDB();
    const meeting = await Meeting.findById(id).lean();
    if (!meeting) return notFound('Meeting not found');

    const sp = request.nextUrl.searchParams;
    const filter = { meeting_id: id };
    const search = (sp.get('search') || '').trim();
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      const users = await User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id').lean();
      filter.user_id = { $in: users.map((u) => u._id) };
    }
    const rsvp = sp.get('rsvp_status');
    if (rsvp && rsvp !== 'all') filter.rsvp_status = rsvp;
    const attendance = sp.get('attendance_status');
    if (attendance && attendance !== 'all') filter.attendance_status = attendance;

    const { page, limit, skip } = getPagination(sp, 10);
    const [attendees, total] = await Promise.all([
      MeetingAttendee.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MeetingAttendee.countDocuments(filter),
    ]);
    return Response.json({ attendees, pagination: paginationPayload(page, limit, total) }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching attendees');
  }
}

export async function POST(request, { params }) {
  try {
    const user = await authorize(request, 'create-meeting-attendees');
    const { id } = await params;
    if (!isValidId(id)) return badRequest('Invalid meeting id');
    const body = await parseBody(request);
    const user_id = toObjectIdOrNull(body.user_id);
    if (!user_id) return badRequest('Participant is required');
    await connectDB();
    const meeting = await Meeting.findById(id).lean();
    if (!meeting) return notFound('Meeting not found');

    const existing = await MeetingAttendee.findOne({ meeting_id: id, user_id }).lean();
    if (existing) return Response.json({ message: 'Participant already added' }, { status: 409 });

    const attendee = await MeetingAttendee.create({
      meeting_id: id,
      user_id,
      type: body.type && ['Required', 'Optional'].includes(body.type) ? body.type : 'Required',
      created_by: user._id,
    });
    const populated = await MeetingAttendee.findById(attendee._id).populate(POPULATE).lean();
    return Response.json({ message: 'Participant added successfully', attendee: populated }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error adding participant');
  }
}
