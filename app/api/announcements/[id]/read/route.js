import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Announcement from '@/lib/models/Announcement';
import AnnouncementView from '@/lib/models/AnnouncementView';
import Employee from '@/lib/models/Employee';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// @route   POST /api/announcements/:id/read
// @desc    Mark announcement as read by an employee (upsert view)
// @access  Private
export async function POST(request, { params }) {
  try {
    await requireAuth(request);
    const { id } = await params;
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'employee_id', required: true, messages: { required: 'employee_id is required' } },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });
    if (!mongoose.Types.ObjectId.isValid(data.employee_id)) {
      return Response.json({ message: 'Invalid employee_id' }, { status: 400 });
    }
    await connectDB();
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return Response.json({ message: 'Announcement not found' }, { status: 404 });
    }
    const employee = await Employee.findById(data.employee_id);
    if (!employee) {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }
    await AnnouncementView.updateOne(
      { announcement_id: id, employee_id: data.employee_id },
      { $set: { viewed_at: new Date() } },
      { upsert: true }
    );
    return Response.json({ message: 'Marked as read', success: true }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    return handleApiError(error, 'Server error marking announcement as read');
  }
}
