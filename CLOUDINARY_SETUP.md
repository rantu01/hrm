# Cloudinary Setup — Media & Document Storage

All file uploads for the HRM / Payroll CRM now go through **Cloudinary** as the
centralized media storage provider. The Next.js server uploads binaries to
Cloudinary via the Cloudinary SDK (server-side only) and persists the resulting
metadata in MongoDB. No files are written to the local filesystem anymore.

## Overview of the flow

1. Client (Media Library UI, drag & drop / file picker) → `POST /api/media/batch`
2. Server validates file type (allowlist) and size (max 20 MB)
3. Server uploads buffer to Cloudinary with a folder + resource type:
   - images → `project/media-library` (or `project/media-library/<directory-slug>`)
   - videos → `project/media-library`
   - audio → `project/media-library`
   - raw (PDF, Office docs, spreadsheets, text, zip) → `project/media-library`
4. Cloudinary returns `public_id`, `secure_url`, format, bytes
5. MongoDB `MediaFile` document stores only the necessary Cloudinary metadata:
   - `url` (Cloudinary secure delivery URL)
   - `public_id` (Cloudinary public id used for delete/replace)
   - `resource_type` (image | video | audio | raw)
   - `file_format` (jpg, png, pdf, mp4, ...)
   - `size`, `mime_type`, `directory_id`, `created_by`
6. Downloads → `GET /api/media/[id]/download` proxy the binary from the
   Cloudinary delivery URL (server-side proxy, no API keys exposed).
7. Deletes → `DELETE /api/media/[id]` destroys the Cloudinary asset via
   `public_id`, then removes the Mongo record.

Folder organization: `project/<subdir>/<directory-slug>` where subdir maps to
the feature area (`users`, `profiles`, `documents`, `gallery`, `products`,
`media-library`) and `<directory-slug>` is an optional Media Library folder slug.

## Required environment variables

Add the following to `.env` (and mirror them in `.env.example`):

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

For this project the active Cloudinary account is:

- Cloud name: `dyhhdl1hy`
- API key: `911268237267532`
- API secret: `En4QQMnYA-9njL4ReledOcKlA_o`

## Local development

1. Copy `.env.example` → `.env` and fill in your Cloudinary credentials.
2. Restart the dev server after editing `.env`:
   ```bash
   npm run dev
   ```
3. The Cloudinary SDK is initialized in `lib/cloudinary.js` from the three
   env vars above. Uploads require a valid Cloudinary account (free tier works).

## Hostinger / production deployment

1. In the Hostinger control panel (or via SSH), set the same environment
   variables in the production `.env`:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
2. Ensure the production build has access to these values (`next build` reads
   `.env.production` / platform env vars).
3. No filesystem paths are required for uploads anymore — the runtime does not
   depend on a local disk for media storage.

## Supported file types & limits

- **Allowed extensions**: jpg, jpeg, png, gif, webp, svg, bmp, mp4, mov, avi, mkv, webm, mp3, wav, ogg, pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv, zip
- **Max size**: 20 MB per file
- **Resource types**: `image`, `video`, `audio`, `raw`

## Security notes

- Cloudinary credentials live only on the server (`lib/cloudinary.js`); they are
  never exposed to the client.
- Media endpoints keep the existing JWT auth (`requireAuth`) and ownership/RBAC
  checks (owner or admin/superadmin for delete).
- HR document file URLs are validated server-side: they must be a Cloudinary
  delivery URL or a legacy `/uploads/...` path.

## Migration notes

- Existing MongoDB records that still hold legacy local `/uploads/...` paths keep
  working through a legacy local-FS fallback in the download endpoints.
- New uploads always write to Cloudinary with a unique public id
  (`use_filename` + `unique_filename`) so re-uploads never overwrite old assets.
- Old Cloudinary assets are only destroyed through an explicit delete action.

## Testing checklist

- [ ] `POST /api/media/batch` with an image / PDF / video / audio file
- [ ] `POST /api/media/batch` rejects disallowed types and > 20 MB files
- [ ] Media Library UI upload + grid/list rendering with Cloudinary URLs
- [ ] `GET /api/media/[id]/download` returns the file for authenticated users
- [ ] `DELETE /api/media/[id]` destroys the Cloudinary asset and removes the DB record
- [ ] HR document create/update with a Cloudinary file URL + download
- [ ] Staff avatars / profile images / candidate resumes / announcements
      attachments that hold Cloudinary URLs render and download correctly
- [ ] Unauthenticated upload/delete/download attempts return 401

## Local cleanup after upload

No local temp files are written during upload anymore; previously written files
under `public/uploads/` are only touched for legacy records.
