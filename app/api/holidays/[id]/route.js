import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Holiday from '@/lib/models/Holiday';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

const HOLIDAY_CATEGORIES = ['national', 'religious', 'company-specific', 'regional'];

// @route   GET /api/holidays/:id
// @desc    Get single holiday by ID
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const holiday = await Holiday.findById(id).populate('branch_ids', 'name');

    if (!holiday) {
      return Response.json({ message: 'Holiday not found' }, { status: 404 });
    }

    return Response.json({ holiday }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Holiday not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching holiday');
  }
}

// @route   PUT /api/holidays/:id
// @desc    Update holiday
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);

    const { id } = await params;

    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'name', optional: true, trim: true },
      { field: 'start_date', optional: true, isISO8601: true, messages: { isISO8601: 'Start date must be a valid date' } },
      { field: 'end_date', optional: true },
      { field: 'category', optional: true, isIn: HOLIDAY_CATEGORIES, messages: { isIn: 'Category is invalid' } },
      { field: 'description', optional: true, trim: true },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    if (data.branch_ids !== undefined && !Array.isArray(data.branch_ids)) {
      return Response.json({ message: 'branch_ids must be an array' }, { status: 400 });
    }
    if (Array.isArray(data.branch_ids)) {
      for (const b of data.branch_ids) {
        if (!mongoose.Types.ObjectId.isValid(b)) {
          return Response.json({ message: 'Invalid branch id in branch_ids' }, { status: 400 });
        }
      }
    }

    await connectDB();

    const existing = await Holiday.findById(id);
    if (!existing) {
      return Response.json({ message: 'Holiday not found' }, { status: 404 });
    }

    const nextStart = data.start_date ?? existing.start_date;
    const nextEnd = data.end_date !== undefined ? data.end_date : existing.end_date;
    if (nextEnd) {
      if (Number.isNaN(Date.parse(nextEnd))) {
        return Response.json({ message: 'End date must be a valid date' }, { status: 400 });
      }
      if (new Date(nextEnd) < new Date(nextStart)) {
        return Response.json({ message: 'End date must be after or equal to start date' }, { status: 400 });
      }
    }

    const patch = { ...data };
    if (body.is_recurring !== undefined) patch.is_recurring = Boolean(body.is_recurring);
    if (body.is_paid !== undefined) patch.is_paid = Boolean(body.is_paid);
    if (body.is_half_day !== undefined) patch.is_half_day = Boolean(body.is_half_day);

    const holiday = await Holiday.findByIdAndUpdate(id, { $set: patch }, {
      returnDocument: 'after',
      runValidators: true,
    }).populate('branch_ids', 'name');

    return Response.json({ message: 'Holiday updated successfully', holiday }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Holiday not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating holiday');
  }
}

// @route   DELETE /api/holidays/:id
// @desc    Delete holiday
// @access  Private
export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const holiday = await Holiday.findByIdAndDelete(id);

    if (!holiday) {
      return Response.json({ message: 'Holiday not found' }, { status: 404 });
    }

    return Response.json({ message: 'Holiday deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Holiday not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting holiday');
  }
}
