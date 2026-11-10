import connectDB from '@/lib/db';
import DocumentCategory from '@/lib/models/DocumentCategory';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const item = await DocumentCategory.findById(id);
    if (!item) return Response.json({ message: 'Document category not found' }, { status: 404 });
    return Response.json({ documentCategory: item }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error fetching document category');
  }
}

export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', optional: true, trim: true },
      { field: 'description', optional: true, trim: true },
      { field: 'color', optional: true, trim: true },
      { field: 'icon', optional: true, trim: true },
      { field: 'sort_order', optional: true },
      { field: 'is_mandatory', optional: true },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    await connectDB();
    const { id } = await params;
    const item = await DocumentCategory.findById(id);
    if (!item) return Response.json({ message: 'Document category not found' }, { status: 404 });

    const payload = { ...data };
    if (payload.sort_order !== undefined && payload.sort_order !== '') payload.sort_order = Number(payload.sort_order);
    if (payload.is_mandatory !== undefined) payload.is_mandatory = payload.is_mandatory === true || payload.is_mandatory === 'true';

    Object.assign(item, payload);
    await item.save();
    return Response.json({ message: 'Document category updated successfully', documentCategory: item }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating document category');
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const item = await DocumentCategory.findById(id);
    if (!item) return Response.json({ message: 'Document category not found' }, { status: 404 });

    // prevent delete if documents exist
    const HrDocument = (await import('@/lib/models/HrDocument')).default;
    const count = await HrDocument.countDocuments({ category_id: id });
    if (count > 0) {
      return Response.json({ message: 'Cannot delete category as it contains documents' }, { status: 400 });
    }

    await item.deleteOne();
    return Response.json({ message: 'Document category deleted successfully' }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error deleting document category');
  }
}