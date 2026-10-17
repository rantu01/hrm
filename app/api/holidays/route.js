import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Holiday from '@/lib/models/Holiday';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

const HOLIDAY_CATEGORIES = ['national', 'religious', 'company-specific', 'regional'];

export async function GET(request) {
  try {
    await requireAuth(request);
    await connectDB();
    const sp = request.nextUrl.searchParams;
    const page = parseInt(sp.get('page'), 10) || 1;
    const perPage = parseInt(sp.get('per_page'), 10) || parseInt(sp.get('limit'), 10) || 10;
    const skip = (page - 1) * perPage;
    const and = [];

    const search = sp.get('search');
    if (search) {
      and.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
    }

    const category = sp.get('category');
    if (category) and.push({ category });

    const branchId = sp.get('branch_id');
    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
      const bid = new mongoose.Types.ObjectId(branchId);
      // Empty branch_ids = company-wide, included in every branch's results
      and.push({ $or: [{ branch_ids: bid }, { branch_ids: { $size: 0 } }] });
    }

    const year = sp.get('year');
    if (year && /^\d{4}$/.test(year)) {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`);
      and.push({ start_date: { $gte: start, $lt: end } });
    }

    const dateFrom = sp.get('date_from');
    const dateTo = sp.get('date_to');
    if (dateFrom || dateTo) {
      const range = {};
      if (dateFrom) range.$gte = new Date(dateFrom);
      if (dateTo) range.$lte = new Date(dateTo);
      and.push({ $or: [{ start_date: range }, { end_date: range }] });
    }

    const filter = and.length > 0 ? { $and: and } : {};

    const allowedSort = { name: 'name', start_date: 'start_date', date: 'start_date' };
    const sortField = allowedSort[sp.get('sort_field')] || 'start_date';
    const sortDir = sp.get('sort_direction') === 'desc' ? -1 : 1;

    const [holidays, total] = await Promise.all([
      Holiday.find(filter)
        .populate('branch_ids', 'name')
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(perPage),
      Holiday.countDocuments(filter),
    ]);
    return Response.json(
      { holidays, pagination: { page, limit: perPage, total, pages: Math.ceil(total / perPage) || 1 } },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching holidays');
  }
}

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'name', required: true, trim: true, messages: { required: 'Holiday name is required' } },
      { field: 'start_date', required: true, isISO8601: true, messages: { required: 'Start date is required', isISO8601: 'Start date must be a valid date' } },
      { field: 'end_date', optional: true },
      { field: 'category', required: true, isIn: HOLIDAY_CATEGORIES, messages: { required: 'Category is required', isIn: 'Category is invalid' } },
      { field: 'description', optional: true, trim: true },
    ]);
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });
    if (data.end_date) {
      if (Number.isNaN(Date.parse(data.end_date))) {
        return Response.json({ message: 'End date must be a valid date' }, { status: 400 });
      }
      if (new Date(data.end_date) < new Date(data.start_date)) {
        return Response.json({ message: 'End date must be after or equal to start date' }, { status: 400 });
      }
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
    const holiday = await Holiday.create({
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date || null,
      category: data.category,
      description: data.description ?? null,
      is_recurring: Boolean(body.is_recurring),
      is_paid: body.is_paid === undefined ? true : Boolean(body.is_paid),
      is_half_day: Boolean(body.is_half_day),
      branch_ids: data.branch_ids || [],
    });
    return Response.json({ message: 'Holiday created successfully', holiday }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating holiday');
  }
}
