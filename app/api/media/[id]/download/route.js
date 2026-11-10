import fs from 'fs';
import fsPromises from 'fs/promises';
import connectDB from '@/lib/db';
import MediaFile from '@/lib/models/MediaFile';
import { requireAuth, handleApiError } from '@/lib/auth';
import { isCloudinaryUrl } from '@/lib/cloudinary';
import { isLocalUploadPath, getUploadFullPath } from '@/lib/storage';

export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const media = await MediaFile.findById(id);
    if (!media) return Response.json({ message: 'Media not found' }, { status: 404 });

    // Cloudinary-hosted asset → proxy the binary from the Cloudinary delivery URL
    if (media.url && isCloudinaryUrl(media.url)) {
      const mediaRes = await fetch(media.url);
      if (!mediaRes.ok) {
        return Response.json({ message: 'File not found on storage' }, { status: 404 });
      }
      const blob = await mediaRes.blob();
      return new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': media.mime_type || mediaRes.headers.get('content-type') || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${media.file_name}"`,
        },
      });
    }

    // Legacy local upload path (pre-Cloudinary records) → stream from local FS
    if (media.url && isLocalUploadPath(media.url)) {
      const fullPath = getUploadFullPath(media.url);
      try {
        const stat = await fsPromises.stat(fullPath);
        const stream = fs.createReadStream(fullPath);
        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': media.mime_type || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${media.file_name}"`,
            'Content-Length': String(stat.size),
          },
        });
      } catch {
        return Response.json({ message: 'File not found on storage' }, { status: 404 });
      }
    }

    // Anything else (e.g. external URL) → redirect
    if (media.url) {
      return Response.redirect(media.url, 302);
    }

    return Response.json({ message: 'File URL missing' }, { status: 404 });
  } catch (error) {
    return handleApiError(error, 'Server error downloading media');
  }
}
