import connectDB from '@/lib/db';
import LeavePolicy from '@/lib/models/LeavePolicy';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';
import { getLeaveAccess } from '@/lib/leave-server';

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    if (!access.canManageTypes) {
      throw new ApiError(403, 'You do not have permission to manage leave types');
    }

    const { id } = await params;
    const policy = await LeavePolicy.findById(id);
    if (!policy) return Response.json({ message: 'Leave policy not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    if (body.name !== undefined) {
      policy.name = String(body.name).trim();
    }
    if (body.description !== undefined) {
      policy.description = body.description !== null ? String(body.description).trim() : null;
    }
    if (body.accrualType !== undefined) {
      policy.accrualType = String(body.accrualType);
    }
    if (body.accrualRate !== undefined) {
      policy.accrualRate = Number(body.accrualRate);
    }
    if (body.carryForwardLimit !== undefined) {
      policy.carryForwardLimit = Number(body.carryForwardLimit);
    }
    if (body.minDaysPerApplication !== undefined) {
      policy.minDaysPerApplication = Number(body.minDaysPerApplication);
    }
    if (body.maxDaysPerApplication !== undefined) {
      policy.maxDaysPerApplication = Number(body.maxDaysPerApplication);
    }
    if (body.requiresApproval !== undefined) {
      policy.requiresApproval = body.requiresApproval;
    }
    if (body.status !== undefined) {
      policy.status = body.status === 'inactive' ? 'inactive' : 'active';
    }

    await policy.save();

    return Response.json(
      { message: 'Leave policy updated successfully', policy },
      { status: 200 }
    );
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Leave policy not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating leave policy');
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    if (!access.canManageTypes) {
      throw new ApiError(403, 'You do not have permission to manage leave types');
    }

    const { id } = await params;
    const policy = await LeavePolicy.findById(id);
    if (!policy) return Response.json({ message: 'Leave policy not found' }, { status: 404 });

    await policy.deleteOne();

    return Response.json(
      { message: 'Leave policy deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Leave policy not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting leave policy');
  }
}

// Toggle status endpoint
export async function PATCH(request, { params }) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    if (!access.canManageTypes) {
      throw new ApiError(403, 'You do not have permission to manage leave types');
    }

    const { id } = await params;
    const policy = await LeavePolicy.findById(id);
    if (!policy) return Response.json({ message: 'Leave policy not found' }, { status: 404 });

    policy.status = policy.status === 'active' ? 'inactive' : 'active';
    await policy.save();

    return Response.json(
      {
        message: `Leave policy ${policy.status === 'active' ? 'activated' : 'deactivated'} successfully`,
        policy,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error?.kind === 'ObjectId' || error?.name === 'CastError') {
      return Response.json({ message: 'Leave policy not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating leave policy status');
  }
}