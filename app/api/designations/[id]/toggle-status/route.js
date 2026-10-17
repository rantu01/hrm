import connectDB from '@/lib/db';
import Designation from '@/lib/models/Designation';
import { requireAuth, handleApiError } from '@/lib/auth';

// @route   PUT /api/designations/:id/toggle-status
// @desc    Toggle designation active/inactive status
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const designation = await Designation.findById(id);

    if (!designation) {
      return Response.json({ message: 'Designation not found' }, { status: 404 });
    }

    designation.status = designation.status === 'active' ? 'inactive' : 'active';
    await designation.save();

    const populated = await Designation.findById(designation._id).populate({
      path: 'department_id',
      select: 'name branch_id',
      populate: { path: 'branch_id', select: 'name' },
    });

    return Response.json(
      { message: 'Designation status updated successfully', designation: populated },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Toggle designation status error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Designation not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating designation status');
  }
}
