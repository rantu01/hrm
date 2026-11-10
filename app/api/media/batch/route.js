import connectDB from '@/lib/db';
import MediaFile from '@/lib/models/MediaFile';
import MediaDirectory from '@/lib/models/MediaDirectory';
import { requireAuth, handleApiError } from '@/lib/auth';
import { saveBufferToUploads } from '@/lib/storage';
import { getResourceTypeFromExtension } from '@/lib/cloudinary';
import { rateLimit, getClientKey } from '@/lib/rate-limit';

const MAX_UPLOADS_PER_WINDOW = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp',
  'mp4', 'mov', 'avi', 'mkv', 'webm',
  'mp3', 'wav', 'ogg',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip',
];

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();

    const rateLimitResult = rateLimit({
      key: `media-upload:${user?._id || getClientKey(request)}`,
      limit: MAX_UPLOADS_PER_WINDOW,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!rateLimitResult.allowed) {
      return Response.json(
        { message: 'Too many upload attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfterSeconds) } }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files[]');
    const directoryId = formData.get('directory_id');

    if (!files || files.length === 0) {
      return Response.json({ message: 'No files provided', errors: ['No files provided'] }, { status: 400 });
    }

    // Validate directory if provided
    let dir = null;
    if (directoryId) {
      dir = await MediaDirectory.findById(directoryId).select('_id slug');
      if (!dir) return Response.json({ message: 'Invalid directory', errors: ['Invalid directory'] }, { status: 400 });
    }

    const uploaded = [];
    const errors = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(`File type not allowed: ${ext.toUpperCase()}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`File too large: ${file.name} (max ${MAX_FILE_SIZE_MB} MB)`);
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const resourceType = getResourceTypeFromExtension(ext);
        const saved = await saveBufferToUploads('media', file.name, buffer, {
          directorySlug: dir?._id ? dir.slug : undefined,
          resourceType,
        });

        const media = await MediaFile.create({
          name: file.name.replace(/\.[^/.]+$/, ''),
          file_name: saved.file_name || file.name,
          url: saved.url,
          thumb_url: saved.url,
          public_id: saved.publicId || null,
          resource_type: saved.resourceType || resourceType,
          file_format: saved.format || null,
          size: saved.size || file.size,
          mime_type: file.type || 'application/octet-stream',
          directory_id: directoryId || null,
          created_by: user._id,
        });

        uploaded.push({
          id: media._id,
          _id: media._id,
          name: media.name,
          file_name: media.file_name,
          url: media.url,
          thumb_url: media.thumb_url,
          public_id: media.public_id,
          resource_type: media.resource_type,
          file_format: media.file_format,
          size: media.size,
          mime_type: media.mime_type,
          directory_id: media.directory_id,
          created_at: media.createdAt,
        });
      } catch (e) {
        console.error('Media upload failed for', file.name, '->', e?.message || String(e), '| stack:', e?.stack || '');
        errors.push(`Upload failed: ${file.name}`);
      }
    }

    if (uploaded.length > 0 && errors.length === 0) {
      return Response.json({ message: `${uploaded.length} file(s) uploaded successfully`, data: uploaded }, { status: 200 });
    }
    if (uploaded.length > 0 && errors.length > 0) {
      return Response.json({ message: `${uploaded.length} uploaded, ${errors.length} failed`, data: uploaded, errors }, { status: 200 });
    }
    return Response.json({ message: 'Upload failed', errors, allowed_types: ALLOWED_EXTENSIONS.join(', '), max_size_mb: MAX_FILE_SIZE_MB }, { status: 422 });
  } catch (error) {
    return handleApiError(error, 'Server error uploading media');
  }
}