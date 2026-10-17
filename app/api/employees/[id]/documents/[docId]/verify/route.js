import connectDB from '@/lib/db';
import EmployeeDocument from '@/lib/models/EmployeeDocument';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// @route   PUT /api/employees/:id/documents/:docId/verify
// @desc    Verify or reject an employee document
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);

    const { id, docId } = await params;
    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'verification_status', required: true, isIn: ['pending', 'verified', 'rejected'], messages: { required: 'Verification status is required' } },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    await connectDB();

    const document = await EmployeeDocument.findOne({ _id: docId, employee_id: id });
    if (!document) {
      return Response.json({ message: 'Document not found' }, { status: 404 });
    }

    document.verification_status = data.verification_status;
    await document.save();

    return Response.json({ message: `Document ${data.verification_status} successfully`, document }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Verify employee document error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Document not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error verifying document');
  }
}
