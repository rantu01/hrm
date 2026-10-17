import connectDB from '@/lib/db';
import EmployeeDocument from '@/lib/models/EmployeeDocument';
import { requireAuth, handleApiError } from '@/lib/auth';

// @route   DELETE /api/employees/:id/documents/:docId
// @desc    Delete an employee document
// @access  Private
export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id, docId } = await params;

    const document = await EmployeeDocument.findOne({ _id: docId, employee_id: id });
    if (!document) {
      return Response.json({ message: 'Document not found' }, { status: 404 });
    }

    await EmployeeDocument.deleteOne({ _id: document._id });

    return Response.json({ message: 'Document deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Delete employee document error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Document not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting document');
  }
}
