import connectDB from '@/lib/db';
import Meeting from '@/lib/models/Meeting';
import { authorizeRecruitment as authorize } from '@/lib/recruitment-server';
import { handleApiError, parseJsonBody } from '@/lib/auth';
import { parseJsonBody as parseBody } from '@/lib/validation';
import { isValidId, badRequest, notFound } from '@/lib/recruitment-server';
import { MEETING_STATUSES } from '@/lib/models/Meeting';

export async function PATCH(request, { params }) {
  try {
    await authorize(request, 'edit-meetings');
    const { id } = await params;
    if (!isValidId(id)) return badRequest('Invalid meeting id');
    const body = await parseBody(request);
    const status = body.status;
    if (!MEETING_STATUSES.includes(status)) return badRequest('Invalid status');
    await connectDB();
    const meeting = await Meeting.findById(id);
    if (!meeting) return notFound('Meeting not found');
    meeting.status = status;
    await meeting.save();
    return Response.json({ message: 'Meeting status updated successfully', meeting: meeting.toObject() }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating meeting status');
  }
}
