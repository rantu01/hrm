import connectDB from '@/lib/db';
import HrDocument from '@/lib/models/HrDocument';
import DocumentCategory from '@/lib/models/DocumentCategory';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import { isCloudinaryUrl } from '@/lib/cloudinary';
import { isLocalUploadPath } from '@/lib/storage';

const STATUSES = ['Draft', 'Under Review', 'Approved', 'Published', 'Archived', 'Expired'];

export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const doc = await HrDocument.findById(id)
      .populate('category_id', 'name color icon')
      .populate('uploaded_by', 'name email')
      .populate('approved_by', 'name email');
    if (!doc) return Response.json({ message: 'HR document not found' }, { status: 404 });
    return Response.json({ hrDocument: doc }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching HR document');
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'title', optional: true, trim: true },
      { field: 'description', optional: true, trim: true },
      { field: 'category_id', optional: true },
      { field: 'file', optional: true, trim: true },
      { field: 'effective_date', optional: true, isISO8601: true },
      { field: 'expiry_date', optional: true, isISO8601: true },
      { field: 'requires_acknowledgment', optional: true },
      { field: 'status', optional: true, isIn: STATUSES },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    await connectDB();
    const { id } = await params;
    const doc = await HrDocument.findById(id);
    if (!doc) return Response.json({ message: 'HR document not found' }, { status: 404 });

    if (data.title !== undefined) doc.title = data.title;
    if (data.description !== undefined) doc.description = data.description || null;
    if (data.category_id !== undefined) {
      const cat = await DocumentCategory.findById(data.category_id).select('_id');
      if (!cat) return Response.json({ message: 'Invalid category selected' }, { status: 400 });
      doc.category_id = data.category_id;
    }
    if (data.file) {
      const fileUrl = data.file;
      if (!isCloudinaryUrl(fileUrl) && !isLocalUploadPath(fileUrl)) {
        return Response.json({ message: 'Invalid file URL. Provide a valid Cloudinary file URL.' }, { status: 400 });
      }
      const fileName = fileUrl.split('/').pop() || doc.file_name;
      let decoded = fileName;
      try { decoded = decodeURIComponent(fileName); } catch {}
      doc.file_name = decoded;
      doc.file_path = fileUrl;
      // increment version
      const parts = String(doc.version || '1.0').split('.');
      parts[1] = String((parseInt(parts[1] || '0', 10) || 0) + 1);
      doc.version = parts.join('.');
    }
    if (data.effective_date !== undefined) doc.effective_date = data.effective_date || null;
    if (data.expiry_date !== undefined) doc.expiry_date = data.expiry_date || null;
    if (data.requires_acknowledgment !== undefined) doc.requires_acknowledgment = data.requires_acknowledgment === true || data.requires_acknowledgment === 'true';
    if (data.status !== undefined) {
      doc.status = data.status;
      if (data.status === 'Approved' && !doc.approved_at) {
        doc.approved_by = user._id;
        doc.approved_at = new Date();
      }
    }

    await doc.save();
    const populated = await HrDocument.findById(doc._id)
      .populate('category_id', 'name color icon')
      .populate('uploaded_by', 'name email')
      .populate('approved_by', 'name email');

    return Response.json({ message: 'Document updated successfully', hrDocument: populated }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating HR document');
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const doc = await HrDocument.findById(id);
    if (!doc) return Response.json({ message: 'HR document not found' }, { status: 404 });
    await doc.deleteOne();
    return Response.json({ message: 'Document deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting HR document');
  }
}