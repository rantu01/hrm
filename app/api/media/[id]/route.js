import connectDB from '@/lib/db';
import MediaFile from '@/lib/models/MediaFile';
import { requireAuth, handleApiError } from '@/lib/auth';
import { deleteUpload } from '@/lib/storage';

export async function DELETE(request, { params }) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const media = await MediaFile.findById(id);
    if (!media) return Response.json({ message: 'Media not found' }, { status: 404 });

    // permission: owner or superadmin
    if (String(media.created_by) !== String(user._id) && user.type !== 'superadmin' && user.type !== 'admin') {
      return Response.json({ message: 'You do not have permission to delete this media' }, { status: 403 });
    }

    // Destroy the Cloudinary asset (new uploads use unique public ids, so this
    // only removes the asset this record points at) and drop the DB record.
    await deleteUpload(media.public_id || media.url);
    await media.deleteOne();
    return Response.json({ message: 'Media deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting media');
  }
}