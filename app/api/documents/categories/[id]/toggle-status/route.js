import connectDB from '@/lib/db';
import DocumentCategory from '@/lib/models/DocumentCategory';
import { requireAuth, handleApiError } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();
    const { id } = await params;
    const item = await DocumentCategory.findById(id);
    if (!item) return Response.json({ message: 'Document category not found' }, { status: 404 });
    item.status = item.status === 'active' ? 'inactive' : 'active';
    await item.save();
    return Response.json({ message: 'Category status updated successfully', documentCategory: item }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating status');
  }
}