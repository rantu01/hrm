import connectDB from '@/lib/db';
import Branch from '@/lib/models/Branch';
import { requireAuth, handleApiError } from '@/lib/auth';

// @route   PUT /api/branches/:id/toggle-status
// @desc    Toggle branch active/inactive status
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const branch = await Branch.findById(id);

    if (!branch) {
      return Response.json({ message: 'Branch not found' }, { status: 404 });
    }

    branch.status = branch.status === 'active' ? 'inactive' : 'active';
    await branch.save();

    return Response.json(
      { message: 'Branch status updated successfully', branch },
      { status: 200 }
    );
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    console.error('Toggle branch status error:', error);
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Branch not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating branch status');
  }
}
