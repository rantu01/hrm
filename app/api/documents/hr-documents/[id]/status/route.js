import connectDB from '@/lib/db';
import HrDocument from '@/lib/models/HrDocument';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

const STATUSES = ['Draft', 'Under Review', 'Approved', 'Published', 'Archived', 'Expired'];

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'status', required: true, isIn: STATUSES, messages: { required: 'Status is required', isIn: 'Invalid status' } },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    await connectDB();
    const { id } = await params;
    const doc = await HrDocument.findById(id);
    if (!doc) return Response.json({ message: 'HR document not found' }, { status: 404 });

    doc.status = data.status;
    if (data.status === 'Approved' && !doc.approved_at) {
      doc.approved_by = user._id;
      doc.approved_at = new Date();
    }
    await doc.save();
    return Response.json({ message: 'Document status updated successfully', hrDocument: doc }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'Server error updating status');
  }
}