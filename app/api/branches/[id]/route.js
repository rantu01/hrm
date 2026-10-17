import connectDB from '@/lib/db';
import Branch from '@/lib/models/Branch';
import Department from '@/lib/models/Department';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

// All routes require authentication

function sanitize(data) {
  const out = { ...(data || {}) };
  for (const key of Object.keys(out)) {
    if (out[key] === '' || out[key] === undefined) delete out[key];
  }
  return out;
}

// @route   GET /api/branches/:id
// @desc    Get single branch by ID
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const branch = await Branch.findById(id);

    if (!branch) {
      return Response.json({ message: 'Branch not found' }, { status: 404 });
    }

    return Response.json({ branch }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Get branch error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Branch not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching branch');
  }
}

// @route   PUT /api/branches/:id
// @desc    Update branch
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);

    const { id } = await params;

    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'name', optional: true, trim: true },
      { field: 'address', optional: true, trim: true },
      { field: 'city', optional: true, trim: true },
      { field: 'state', optional: true, trim: true },
      { field: 'country', optional: true, trim: true },
      { field: 'zip_code', optional: true, trim: true },
      { field: 'phone', optional: true, trim: true },
      { field: 'email', optional: true, trim: true, isEmail: true, messages: { isEmail: 'Please provide a valid email' } },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    await connectDB();

    const branch = await Branch.findByIdAndUpdate(id, { $set: sanitize(data) }, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!branch) {
      return Response.json({ message: 'Branch not found' }, { status: 404 });
    }

    return Response.json(
      {
        message: 'Branch updated successfully',
        branch,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Update branch error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Branch not found' }, { status: 404 });
    }
    if (error.code === 11000) {
      return Response.json({ message: 'Branch already exists' }, { status: 400 });
    }
    return handleApiError(error, 'Server error updating branch');
  }
}

// @route   DELETE /api/branches/:id
// @desc    Delete branch
// @access  Private
export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const departmentCount = await Department.countDocuments({ branch_id: id });
    if (departmentCount > 0) {
      return Response.json(
        { message: 'Cannot delete branch with assigned departments' },
        { status: 400 }
      );
    }

    const branch = await Branch.findByIdAndDelete(id);

    if (!branch) {
      return Response.json({ message: 'Branch not found' }, { status: 404 });
    }

    return Response.json({ message: 'Branch deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Delete branch error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Branch not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting branch');
  }
}
