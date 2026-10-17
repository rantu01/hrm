import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Announcement from '@/lib/models/Announcement';
import AnnouncementView from '@/lib/models/AnnouncementView';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

const CATEGORIES = ['company news', 'policy updates', 'events', 'HR', 'IT updates'];

// @route   GET /api/announcements/:id
// @desc    Get single announcement by ID
// @access  Private
export async function GET(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const announcement = await Announcement.findById(id)
      .populate('branch_ids', 'name')
      .populate('department_ids', 'name');

    if (!announcement) {
      return Response.json({ message: 'Announcement not found' }, { status: 404 });
    }

    return Response.json({ announcement }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Announcement not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error fetching announcement');
  }
}

// @route   PUT /api/announcements/:id
// @desc    Update announcement
// @access  Private
export async function PUT(request, { params }) {
  try {
    await requireAuth(request);

    const { id } = await params;

    const body = await parseJsonBody(request);

    const { errors, data } = validateBody(body, [
      { field: 'title', optional: true, trim: true },
      { field: 'category', optional: true, isIn: CATEGORIES, messages: { isIn: 'Category is invalid' } },
      { field: 'description', optional: true, trim: true },
      { field: 'content', optional: true },
      { field: 'start_date', optional: true, isISO8601: true, messages: { isISO8601: 'Start date must be a valid date' } },
      { field: 'end_date', optional: true },
      { field: 'attachments', optional: true, trim: true },
    ]);

    if (errors.length > 0) {
      return Response.json({ errors }, { status: 400 });
    }

    await connectDB();

    const existing = await Announcement.findById(id);
    if (!existing) {
      return Response.json({ message: 'Announcement not found' }, { status: 404 });
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

    const nextCompanyWide =
      body.is_company_wide === undefined ? existing.is_company_wide : Boolean(body.is_company_wide);
    const nextBranches = body.branch_ids !== undefined ? body.branch_ids : existing.branch_ids.map(String);
    const nextDepts =
      body.department_ids !== undefined ? body.department_ids : existing.department_ids.map(String);
    if (!nextCompanyWide && nextBranches.length === 0 && nextDepts.length === 0) {
      return Response.json(
        { message: 'Select at least one branch or department when the announcement is not company-wide' },
        { status: 400 }
      );
    }
    for (const b of nextBranches) {
      if (!mongoose.Types.ObjectId.isValid(b)) {
        return Response.json({ message: 'Invalid branch id in branch_ids' }, { status: 400 });
      }
    }
    for (const d of nextDepts) {
      if (!mongoose.Types.ObjectId.isValid(d)) {
        return Response.json({ message: 'Invalid department id in department_ids' }, { status: 400 });
      }
    }

    const patch = { ...data };
    if (body.is_featured !== undefined) patch.is_featured = Boolean(body.is_featured);
    if (body.is_high_priority !== undefined) patch.is_high_priority = Boolean(body.is_high_priority);
    if (body.is_company_wide !== undefined) patch.is_company_wide = nextCompanyWide;
    if (body.branch_ids !== undefined) patch.branch_ids = nextCompanyWide ? [] : nextBranches;
    else if (body.is_company_wide !== undefined) patch.branch_ids = nextCompanyWide ? [] : nextBranches;
    if (body.department_ids !== undefined) patch.department_ids = nextCompanyWide ? [] : nextDepts;
    else if (body.is_company_wide !== undefined) patch.department_ids = nextCompanyWide ? [] : nextDepts;

    const announcement = await Announcement.findByIdAndUpdate(id, { $set: patch }, {
      returnDocument: 'after',
      runValidators: true,
    })
      .populate('branch_ids', 'name')
      .populate('department_ids', 'name');

    return Response.json({ message: 'Announcement updated successfully', announcement }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Announcement not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error updating announcement');
  }
}

// @route   DELETE /api/announcements/:id
// @desc    Delete announcement
// @access  Private
export async function DELETE(request, { params }) {
  try {
    await requireAuth(request);
    await connectDB();

    const { id } = await params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return Response.json({ message: 'Announcement not found' }, { status: 404 });
    }

    await AnnouncementView.deleteMany({ announcement_id: id });

    return Response.json({ message: 'Announcement deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error;
    if (error.kind === 'ObjectId' || error.name === 'CastError') {
      return Response.json({ message: 'Announcement not found' }, { status: 404 });
    }
    return handleApiError(error, 'Server error deleting announcement');
  }
}
