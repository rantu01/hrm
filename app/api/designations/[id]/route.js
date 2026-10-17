import connectDB from '@/lib/db';
import Designation from '@/lib/models/Designation';
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

function designationPopulate(query) {
  return query.populate({
    path: 'department_id',
    select: 'name branch_id',
    populate: { path: 'branch_id', select: 'name' },
  });
}

// @route   GET /api/designations/:id
// @desc    Get single designation by ID
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const designation = await designationPopulate(Designation.findById(id));

    if (!designation) {
      return Response.json({ message: 'Designation not found' }, { status: 404 });
    }

    return Response.json({ designation }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Get designation error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Designation not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching designation');
  }
}

// @route   PUT /api/designations/:id
// @desc    Update designation
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);

    const { id } = await params;

    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'name', optional: true, trim: true },
      { field: 'description', optional: true, trim: true },
      { field: 'department_id', optional: true },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    await connectDB();

    const designation = await designationPopulate(
      Designation.findByIdAndUpdate(id, { $set: sanitize(data) }, {
        returnDocument: 'after',
        runValidators: true,
      })
    );

    if (!designation) {
      return Response.json({ message: 'Designation not found' }, { status: 404 });
    }

    return Response.json(
      {
        message: 'Designation updated successfully',
        designation,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Update designation error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Designation not found' }, { status: 404 });
    }
    if (error.code === 11000) {
      return Response.json({ message: 'Designation already exists' }, { status: 400 });
    }
    return handleApiError(error, 'Server error updating designation');
  }
}

// @route   DELETE /api/designations/:id
// @desc    Delete designation
// @access  Private
export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const designation = await Designation.findByIdAndDelete(id);

    if (!designation) {
      return Response.json({ message: 'Designation not found' }, { status: 404 });
    }

    return Response.json({ message: 'Designation deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Delete designation error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Designation not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting designation');
  }
}
