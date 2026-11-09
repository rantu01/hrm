import connectDB from '@/lib/db';
import MeetingMinute from '@/lib/models/MeetingMinute';
import { authorizeRecruitment as authorize } from '@/lib/recruitment-server';
import { handleApiError } from '@/lib/auth';
import { parseJsonBody as parseBody } from '@/lib/validation';
import { isValidId, badRequest, notFound } from '@/lib/recruitment-server';

const POPULATE = [{ path: 'recorded_by', select: 'name email' }];

export async function PUT(request, { params }) {
  try {
    await authorize(request, 'edit-meeting-minutes');
    const { id, minuteId } = await params;
    if (!isValidId(id) || !isValidId(minuteId)) return badRequest('Invalid id');
    const body = await parseBody(request);
    await connectDB();
    const minute = await MeetingMinute.findById(minuteId);
    if (!minute || String(minute.meeting_id) !== String(id)) return notFound('Minute not found');

    if (body.topic !== undefined) {
      const t = String(body.topic).trim();
      if (!t) return badRequest('Topic is required');
      minute.topic = t;
    }
    if (body.content !== undefined) {
      const c = String(body.content).trim();
      if (!c) return badRequest('Content is required');
      minute.content = c;
    }
    if (body.type && ['Discussion', 'Decision', 'Action Item', 'Note'].includes(body.type)) minute.type = body.type;
    if (body.recorded_at) minute.recorded_at = new Date(body.recorded_at);
    await minute.save();
    const populated = await MeetingMinute.findById(minute._id).populate(POPULATE).lean();
    return Response.json({ message: 'Minute updated successfully', minute: populated }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating minute');
  }
}

export async function DELETE(request, { params }) {
  try {
    await authorize(request, 'delete-meeting-minutes');
    const { id, minuteId } = await params;
    if (!isValidId(id) || !isValidId(minuteId)) return badRequest('Invalid id');
    await connectDB();
    const minute = await MeetingMinute.findById(minuteId).lean();
    if (!minute || String(minute.meeting_id) !== String(id)) return notFound('Minute not found');
    await MeetingMinute.findByIdAndDelete(minuteId);
    return Response.json({ message: 'Minute deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting minute');
  }
}
