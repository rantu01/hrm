import connectDB from '@/lib/db';
import LeavePolicy from '@/lib/models/LeavePolicy';
import LeaveType from '@/lib/models/LeaveType';
import { requireAuth, handleApiError, ApiError } from '@/lib/auth';
import { parseJsonBody } from '@/lib/validation';
import { getLeaveAccess, isValidObjectId, parsePagination } from '@/lib/leave-server';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    const sp = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(sp, 20);

    const requestedStatus = sp.get('status');
    const filter = {};

    if (!access.canManageTypes && !access.canViewAll) {
      return Response.json(
        {
          policies: [],
          summary: { count: 0 },
          access,
        },
        { status: 200 }
      );
    }

    if (requestedStatus && requestedStatus !== 'all') {
      filter.status = requestedStatus;
    } else if (!access.canViewAll) {
      filter.status = 'active';
    }

    if (sp.get('leaveType')) {
      if (!isValidObjectId(sp.get('leaveType'))) {
        throw new ApiError(400, 'Invalid leave type filter');
      }
      filter.leaveType = sp.get('leaveType');
    }

    const search = (sp.get('search') || '').trim();
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sortMap = {
      name: 'name',
      created_at: 'createdAt',
      createdAt: 'createdAt',
    };
    const sortField = sortMap[sp.get('sort_field')] || 'name';
    const sortDirection = sp.get('sort_direction') === 'desc' ? -1 : 1;

    const [policies, total] = await Promise.all([
      LeavePolicy.find(filter)
        .populate('leaveType', 'name code color isPaid')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit),
      LeavePolicy.countDocuments(filter),
    ]);

    return Response.json(
      {
        policies,
        statusCounts: {
          all: total,
          active: await LeavePolicy.countDocuments({ status: 'active' }),
          inactive: await LeavePolicy.countDocuments({ status: 'inactive' }),
        },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        access,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching leave policies');
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const access = await getLeaveAccess(user);
    if (!access.canManageTypes) {
      throw new ApiError(403, 'You do not have permission to manage leave types');
    }

    const body = await parseJsonBody(request);
    const name = String(body.name || '').trim();
    if (!name) throw new ApiError(400, 'Leave policy name is required');

    const leaveType = await LeaveType.findById(body.leaveType);
    if (!leaveType) throw new ApiError(404, 'Leave type not found');

    // Check if policy already exists for this leave type
    const existing = await LeavePolicy.findOne({ leaveType: leaveType._id });
    if (existing) {
      throw new ApiError(409, 'A leave policy already exists for this leave type. Use update instead.');
    }

    const policy = await LeavePolicy.create({
      name,
      description: body.description ? String(body.description).trim() : null,
      leaveType: leaveType._id,
      accrualType: body.accrualType || 'yearly',
      accrualRate: Number(body.accrualRate) || 0,
      carryForwardLimit: Number(body.carryForwardLimit) || 0,
      minDaysPerApplication: Number(body.minDaysPerApplication) || 1,
      maxDaysPerApplication: Number(body.maxDaysPerApplication) || 30,
      requiresApproval: body.requiresApproval !== false,
      status: body.status === 'inactive' ? 'inactive' : 'active',
      createdBy: user._id,
    });

    return Response.json(
      { message: 'Leave policy created successfully', policy },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json({ message: 'A leave policy with this name already exists' }, { status: 409 });
    }
    return handleApiError(error, 'Server error creating leave policy');
  }
}

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

    const body = await parseJsonBody(request);
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
    if (error?.code === 11000) {
      return Response.json({ message: 'A leave policy with this name already exists' }, { status: 409 });
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