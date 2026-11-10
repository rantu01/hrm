import path from 'path';
import fs from 'fs/promises';
import { buildUploadFolder, deleteFromCloudinary, getPublicIdFromUrl, isCloudinaryUrl, uploadToCloudinary } from '@/lib/cloudinary';

export const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');

export function sanitizeFileName(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function getUploadFullPath(relativeUrl) {
  const cleaned = (relativeUrl || '').replace(/^\/+/, '');
  return path.join(process.cwd(), 'public', cleaned);
}

// Legacy local upload path (e.g. `/uploads/media/xyz.jpg`) — kept so records
// created before the Cloudinary migration can still be resolved/downloaded.
export function isLocalUploadPath(url) {
  return typeof url === 'string' && url.trim().startsWith('/uploads/');
}

// Upload a file buffer to Cloudinary and return the resulting storage metadata.
// No local filesystem writes happen anymore — assets live on Cloudinary.
export async function saveBufferToUploads(subdir, originalName, buffer, options = {}) {
  const folder = options.folder || buildUploadFolder(subdir, options.directorySlug);
  const uploaded = await uploadToCloudinary({
    buffer,
    originalName,
    folder,
    resourceType: options.resourceType,
  });

  return {
    filename: uploaded.publicId.split('/').pop() || `file_${Date.now()}`,
    relativePath: uploaded.url,
    publicId: uploaded.publicId,
    url: uploaded.url,
    secureUrl: uploaded.url,
    file_name: uploaded.originalFilename || originalName,
    size: uploaded.bytes,
    mime_type: options.mime_type || null,
    resourceType: uploaded.resourceType,
    format: uploaded.format,
  };
}

// Delete an asset. Accepts a Cloudinary URL / public id, or a legacy local
// `/uploads/...` path (kept so pre-Cloudinary records can still be cleaned up).
export async function deleteUpload(ref) {
  if (!ref) return false;

  if (isCloudinaryUrl(ref)) {
    const publicId = getPublicIdFromUrl(ref);
    const result = await deleteFromCloudinary(publicId);
    return result?.result === 'ok';
  }

  const value = String(ref);
  if (value.startsWith('/')) {
    // Legacy local upload cleanup
    const cleaned = value.replace(/^\/+/, '');
    const fullPath = path.join(process.cwd(), 'public', cleaned);
    if (fullPath.startsWith(path.join(process.cwd(), 'public'))) {
      try {
        await fs.unlink(fullPath);
      } catch {
        // ignore
      }
    }
    return true;
  }

  // Bare Cloudinary public id
  const result = await deleteFromCloudinary(value);
  return result?.result === 'ok';
}
