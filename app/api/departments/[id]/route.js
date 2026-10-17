import connectDB from '@/lib/db';
import Department from '@/lib/models/Department';
import Designation from '@/lib/models/Designation';
import Employee from '@/lib/models/Employee';
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

// @route   GET /api/departments/:id
// @desc    Get single department by ID
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const department = await Department.findById(id).populate('branch_id', 'name');

    if (!department) {
      return Response.json({ message: 'Department not found' }, { status: 404 });
    }

    return Response.json({ department }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Get department error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Department not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching department');
  }
}

// @route   PUT /api/departments/:id
// @desc    Update department
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);

    const { id } = await params;

    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'name', optional: true, trim: true },
      { field: 'branch_id', optional: true },
      { field: 'description', optional: true, trim: true },
      { field: 'status', optional: true, isIn: ['active', 'inactive'] },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    await connectDB();

    const department = await Department.findByIdAndUpdate(id, { $set: sanitize(data) }, {
      returnDocument: 'after',
      runValidators: true,
    }).populate('branch_id', 'name');

    if (!department) {
      return Response.json({ message: 'Department not found' }, { status: 404 });
    }

    return Response.json(
      {
        message: 'Department updated successfully',
        department,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Update department error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Department not found' }, { status: 404 });
    }
    if (error.code === 11000) {
      return Response.json({ message: 'Department already exists' }, { status: 400 });
    }
    return handleApiError(error, 'Server error updating department');
  }
}

// @route   DELETE /api/departments/:id
// @desc    Delete department
// @access  Private
export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const designationCount = await Designation.countDocuments({ department_id: id });
    if (designationCount > 0) {
      return Response.json(
        { message: 'Cannot delete department with assigned designations' },
        { status: 400 }
      );
    }

    let employeeCount = 0;
    try {
      employeeCount = await Employee.countDocuments({
        $or: [{ department_id: id }, { department: id }],
      });
    } catch {
      employeeCount = 0;
    }
    if (employeeCount > 0) {
      return Response.json(
        { message: 'Cannot delete department with assigned employees' },
        { status: 400 }
      );
    }

    const department = await Department.findByIdAndDelete(id);

    if (!department) {
      return Response.json({ message: 'Department not found' }, { status: 404 });
    }

    return Response.json({ message: 'Department deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Delete department error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Department not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting department');
  }
}
