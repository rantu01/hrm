import fs from 'fs';
import fsPromises from 'fs/promises';
import connectDB from '@/lib/db';
import HrDocument from '@/lib/models/HrDocument';
import { requireAuth, handleApiError } from '@/lib/auth';
import { isCloudinaryUrl } from '@/lib/cloudinary';
import { isLocalUploadPath, getUploadFullPath } from '@/lib/storage';

export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const doc = await HrDocument.findById(id);
    if (!doc) return Response.json({ message: 'HR document not found' }, { status: 404 });

    doc.download_count = (doc.download_count || 0) + 1;
    await doc.save();

    // Cloudinary-hosted file → proxy the binary from the Cloudinary delivery URL
    if (doc.file_path && isCloudinaryUrl(doc.file_path)) {
      const fileRes = await fetch(doc.file_path);
      if (!fileRes.ok) {
        return Response.json({ message: 'File not found on storage' }, { status: 404 });
      }
      const blob = await fileRes.blob();
      return new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': doc.file_type || fileRes.headers.get('content-type') || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${doc.file_name}"`,
        },
      });
    }

    // Legacy local upload path (pre-Cloudinary records) → stream from local FS
    if (doc.file_path && isLocalUploadPath(doc.file_path)) {
      const fullPath = getUploadFullPath(doc.file_path);
      try {
        const stat = await fsPromises.stat(fullPath);
        const stream = fs.createReadStream(fullPath);
        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': doc.file_type || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${doc.file_name}"`,
            'Content-Length': String(stat.size),
          },
        });
      } catch {
        return Response.json({ message: 'File not found on storage' }, { status: 404 });
      }
    }

    // Otherwise redirect to URL
    if (doc.file_path) {
      return Response.redirect(doc.file_path, 302);
    }

    return Response.json({ message: 'File URL missing' }, { status: 404 });
  } catch (error) {
    return handleApiError(error, 'Server error downloading document');
  }
}
