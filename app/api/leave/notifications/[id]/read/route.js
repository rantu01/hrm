import connectDB from '@/lib/db';
import LeaveNotification from '@/lib/models/LeaveNotification';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const { id } = await params;

    const notification = await LeaveNotification.findById(id);
    if (!notification) {
      return Response.json({ message: 'Notification not found' }, { status: 404 });
    }
    if (String(notification.recipient) !== String(user._id)) {
      throw new ApiError(403, 'You do not have permission to update this notification');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return Response.json({ message: 'Notification marked as read', notification }, { status: 200 });
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Notification not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating notification');
  }
}
