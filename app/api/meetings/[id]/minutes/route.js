import connectDB from '@/lib/db';
import Meeting from '@/lib/models/Meeting';
import MeetingMinute from '@/lib/models/MeetingMinute';
import User from '@/lib/models/User';
import { authorizeRecruitment as authorize } from '@/lib/recruitment-server';
import { handleApiError } from '@/lib/auth';
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

const POPULATE = [{ path: 'recorded_by', select: 'name email' }];

export async function GET(request, { params }) {
  try {
    await authorize(request, 'view-meeting-minutes');
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
      filter.$or = [{ topic: rx }, { content: rx }];
    }
    const type = sp.get('type');
    if (type && type !== 'all') filter.type = type;
    const recorded_by = sp.get('recorded_by');
    if (recorded_by) {
      const oid = toObjectIdOrNull(recorded_by);
      if (!oid) return badRequest('Invalid recorded_by');
      filter.recorded_by = oid;
    }

    const { page, limit, skip } = getPagination(sp, 10);
    const [minutes, total] = await Promise.all([
      MeetingMinute.find(filter).populate(POPULATE).sort({ recorded_at: -1 }).skip(skip).limit(limit).lean(),
      MeetingMinute.countDocuments(filter),
    ]);
    return Response.json({ minutes, pagination: paginationPayload(page, limit, total) }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching minutes');
  }
}

export async function POST(request, { params }) {
  try {
    const user = await authorize(request, 'create-meeting-minutes');
    const { id } = await params;
    if (!isValidId(id)) return badRequest('Invalid meeting id');
    const body = await parseBody(request);
    const topic = String(body.topic || '').trim();
    if (!topic) return badRequest('Topic is required');
    const content = String(body.content || '').trim();
    if (!content) return badRequest('Content is required');
    const type = body.type && ['Discussion', 'Decision', 'Action Item', 'Note'].includes(body.type) ? body.type : 'Discussion';

    await connectDB();
    const meeting = await Meeting.findById(id).lean();
    if (!meeting) return notFound('Meeting not found');

    const recorded_by = body.recorded_by ? toObjectIdOrNull(body.recorded_by) : user._id;
    if (!recorded_by) return badRequest('Recorder is required');
    const recorded_at = body.recorded_at ? new Date(body.recorded_at) : new Date();

    const minute = await MeetingMinute.create({
      meeting_id: id,
      topic,
      content,
      type,
      recorded_by,
      recorded_at,
      created_by: user._id,
    });
    const populated = await MeetingMinute.findById(minute._id).populate(POPULATE).lean();
    return Response.json({ message: 'Meeting minute added successfully', minute: populated }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error adding minute');
  }
}
