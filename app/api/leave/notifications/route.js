import connectDB from '@/lib/db';
import LeaveNotification from '@/lib/models/LeaveNotification';
import { requireAuth, handleApiError } from '@/lib/auth';
import { parsePagination } from '@/lib/leave-server';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const sp = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(sp, 10);
    const unreadOnly = sp.get('unread_only') === 'true' || sp.get('unread_only') === '1';

    const filter = { recipient: user._id };
    if (unreadOnly) filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      LeaveNotification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      LeaveNotification.countDocuments(filter),
      LeaveNotification.countDocuments({ recipient: user._id, isRead: false }),
    ]);

    return Response.json(
      {
        notifications,
        unreadCount,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching leave notifications');
  }
}

export async function PUT(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const now = new Date();
    const result = await LeaveNotification.updateMany(
      { recipient: user._id, isRead: false },
      { $set: { isRead: true, readAt: now } }
    );

    return Response.json(
      { message: 'Notifications marked as read', updated: result.modifiedCount || 0 },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error marking notifications as read');
  }
}
