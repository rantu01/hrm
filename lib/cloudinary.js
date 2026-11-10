import cloudinaryModule from 'cloudinary';
import fs from 'fs';
import os from 'os';
import path from 'path';

// `cloudinary` CJS module exposes the API v2 instance as `.v2`. Resolve it
// defensively so both interop shapes work in dev and production builds.
const cloudinary = cloudinaryModule?.v2 || cloudinaryModule;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const CLOUDINARY_DELIVERY_BASE = 'https://res.cloudinary.com';

export const DEFAULT_UPLOAD_FOLDER = 'project/media-library';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg'];
const RAW_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip'];

export function getResourceTypeFromExtension(ext) {
  const value = String(ext || '').toLowerCase().replace('.', '');
  if (IMAGE_EXTENSIONS.includes(value)) return 'image';
  // Cloudinary treats all video *and* audio assets as the `video` resource type.
  if (VIDEO_EXTENSIONS.includes(value) || AUDIO_EXTENSIONS.includes(value)) return 'video';
  if (RAW_EXTENSIONS.includes(value)) return 'raw';
  return null;
}

export function isCloudinaryUrl(url) {
  if (typeof url !== 'string' || !url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'res.cloudinary.com' && parsed.pathname.length > 0;
  } catch {
    return false;
  }
}

export function getPublicIdFromUrl(url) {
  if (typeof url !== 'string' || !url) return null;
  if (!/^https?:\/\//i.test(url)) return url;

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
    const startIndex = versionIndex >= 0 ? versionIndex + 1 : 0;
    const publicId = segments.slice(startIndex).join('/');
    if (!publicId) return null;
    try {
      return decodeURIComponent(publicId);
    } catch {
      return publicId;
    }
  } catch {
    return null;
  }
}

export function buildUploadFolder(subdir, directorySlug) {
  const base = subdir || 'media-library';
  if (directorySlug) return `project/${base}/${directorySlug}`;
  return `project/${base}`;
}

function sanitizeFileName(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadToCloudinary({ buffer, originalName, folder, resourceType }) {
  const resolvedResourceType = resourceType || getResourceTypeFromExtension(originalName) || 'image';

  // The Cloudinary uploader accepts a file path (or remote URL) — not a raw
  // Buffer — so stage the buffer in a temporary file, upload, then clean up.
  const safeName = sanitizeFileName(originalName);
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cld-upload-'));
  const tempFile = path.join(tempDir, safeName || `upload_${Date.now()}`);
  try {
    await fs.promises.writeFile(tempFile, buffer);
    const result = await cloudinary.uploader.upload(tempFile, {
      folder: folder || DEFAULT_UPLOAD_FOLDER,
      resource_type: resolvedResourceType,
      use_filename: true,
      unique_filename: true,
    });

    return {
      publicId: result.public_id,
      public_id: result.public_id,
      url: result.secure_url,
      secureUrl: result.secure_url,
      deliveryUrl: result.secure_url,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      originalFilename: result.original_filename,
      width: result.width,
      height: result.height,
    };
  } finally {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failures
    }
  }
}

export async function deleteFromCloudinary(publicId) {
  if (!publicId) return { result: 'not found' };
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result || { result: 'not found' };
  } catch (error) {
    console.error('Cloudinary delete failed:', error?.message || error);
    return { result: 'error', error: error?.message || 'Cloudinary delete failed' };
  }
}
