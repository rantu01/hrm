import connectDB from '@/lib/db';
import MediaFile from '@/lib/models/MediaFile';
import MediaDirectory from '@/lib/models/MediaDirectory';
import { requireAuth, handleApiError } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAuth(request);
    await connectDB();
    const sp = request.nextUrl.searchParams;
    const directoryId = sp.get('directory_id');

    const mediaFilter = {};
    if (directoryId) mediaFilter.directory_id = directoryId;

    const media = await MediaFile.find(mediaFilter).sort({ createdAt: -1 });
    const directories = await MediaDirectory.find({}).sort({ name: 1 });

    const mapped = media.map((m) => ({
      id: m._id,
      _id: m._id,
      name: m.name,
      file_name: m.file_name,
      url: m.url,
      thumb_url: m.thumb_url || m.url,
      public_id: m.public_id,
      resource_type: m.resource_type,
      file_format: m.file_format,
      size: m.size,
      mime_type: m.mime_type,
      directory_id: m.directory_id,
      created_at: m.createdAt,
    }));

    const mappedDirs = directories.map((d) => ({ id: d._id, _id: d._id, name: d.name, slug: d.slug }));

    return Response.json({ media: mapped, directories: mappedDirs }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching media');
  }
}