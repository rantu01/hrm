import connectDB from '@/lib/db';
import Department from '@/lib/models/Department';
import { requireAuth, handleApiError } from '@/lib/auth';

// @route   PUT /api/departments/:id/toggle-status
// @desc    Toggle department active/inactive status
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const department = await Department.findById(id);

    if (!department) {
      return Response.json({ message: 'Department not found' }, { status: 404 });
    }

    department.status = department.status === 'active' ? 'inactive' : 'active';
    await department.save();

    const populated = await Department.findById(department._id).populate('branch_id', 'name');

    return Response.json(
      { message: 'Department status updated successfully', department: populated },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Toggle department status error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Department not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating department status');
  }
}
