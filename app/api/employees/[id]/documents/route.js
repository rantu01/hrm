import connectDB from '@/lib/db';
import Employee from '@/lib/models/Employee';
import EmployeeDocument from '@/lib/models/EmployeeDocument';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// @route   GET /api/employees/:id/documents
// @desc    List an employee's documents
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const employee = await Employee.findById(id).select('_id');
    if (!employee) {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }

    const documents = await EmployeeDocument.find({ employee_id: id }).sort({ createdAt: -1 });

    return Response.json({ documents }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Get employee documents error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching documents');
  }
}

// @route   POST /api/employees/:id/documents
// @desc    Add a document for an employee
// @access  Private
export async function POST(request, { params }) {
  try {
    await requireAuth(request);

    const { id } = await params;
    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'document_type', required: true, trim: true, messages: { required: 'Document type is required' } },
      { field: 'file', optional: true, trim: true },
      { field: 'expiry_date', optional: true, isISO8601: true, messages: { isISO8601: 'Expiry date must be a valid date' } },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    await connectDB();

    const employee = await Employee.findById(id).select('_id');
    if (!employee) {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }

    const payload = { employee_id: id, document_type: data.document_type };
    if (data.file) payload.file = data.file;
    if (data.expiry_date) payload.expiry_date = data.expiry_date;

    const document = await EmployeeDocument.create(payload);

    return Response.json({ message: 'Document added successfully', document }, { status: 201 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Add employee document error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Employee not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error adding document');
  }
}
