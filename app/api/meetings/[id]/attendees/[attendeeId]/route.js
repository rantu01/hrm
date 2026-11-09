import connectDB from '@/lib/db';
import MeetingAttendee from '@/lib/models/MeetingAttendee';
import { authorizeRecruitment as authorize } from '@/lib/recruitment-server';
import { handleApiError } from '@/lib/auth';
import { parseJsonBody as parseBody } from '@/lib/validation';
import {
  isValidId,
  badRequest,
  notFound,
} from '@/lib/recruitment-server';

const POPULATE = [{ path: 'user_id', select: 'name email' }];

export async function PUT(request, { params }) {
  try {
    await authorize(request, 'edit-meeting-attendees');
    const { id, attendeeId } = await params;
    if (!isValidId(id) || !isValidId(attendeeId)) return badRequest('Invalid id');
    const body = await parseBody(request);
    await connectDB();
    const attendee = await MeetingAttendee.findById(attendeeId);
    if (!attendee || String(attendee.meeting_id) !== String(id)) return notFound('Attendee not found');

    if (body.type && ['Required', 'Optional'].includes(body.type)) attendee.type = body.type;
    if (body.rsvp_status && ['Pending', 'Accepted', 'Declined', 'Tentative'].includes(body.rsvp_status)) {
      attendee.rsvp_status = body.rsvp_status;
      attendee.rsvp_date = new Date();
    }
    if (body.attendance_status && ['Not Attended', 'Present', 'Late', 'Left Early'].includes(body.attendance_status)) {
      attendee.attendance_status = body.attendance_status;
    }
    if (body.decline_reason !== undefined) attendee.decline_reason = body.decline_reason ? String(body.decline_reason).trim() : null;
    await attendee.save();
    const populated = await MeetingAttendee.findById(attendee._id).populate(POPULATE).lean();
    return Response.json({ message: 'Participant updated successfully', attendee: populated }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating participant');
  }
}

export async function DELETE(request, { params }) {
  try {
    await authorize(request, 'delete-meeting-attendees');
    const { id, attendeeId } = await params;
    if (!isValidId(id) || !isValidId(attendeeId)) return badRequest('Invalid id');
    await connectDB();
    const attendee = await MeetingAttendee.findById(attendeeId).lean();
    if (!attendee || String(attendee.meeting_id) !== String(id)) return notFound('Attendee not found');
    await MeetingAttendee.findByIdAndDelete(attendeeId);
    return Response.json({ message: 'Participant removed successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error removing participant');
  }
}
