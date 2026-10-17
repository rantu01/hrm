import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Announcement from '@/lib/models/Announcement';
import { requireAuth, handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';

const CATEGORIES = ['company news', 'policy updates', 'events', 'HR', 'IT updates'];

function statusFilter(status) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (status === 'active') {
    return {
      $and: [
        { start_date: { $lte: today } },
        { $or: [{ end_date: null }, { end_date: { $exists: false } }, { end_date: { $gte: today } }] },
      ],
    };
  }
  if (status === 'upcoming') return { start_date: { $gt: today } };
  if (status === 'expired') return { end_date: { $lt: today } };
  return null;
}

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
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
        ],
      });
    }

    const category = sp.get('category');
    if (category) and.push({ category });

    const branchId = sp.get('branch_id');
    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
      const bid = new mongoose.Types.ObjectId(branchId);
      and.push({ $or: [{ is_company_wide: true }, { branch_ids: bid }] });
    }

    const deptId = sp.get('department_id');
    if (deptId && mongoose.Types.ObjectId.isValid(deptId)) {
      const did = new mongoose.Types.ObjectId(deptId);
      and.push({ $or: [{ is_company_wide: true }, { department_ids: did }] });
    }

    const status = sp.get('status');
    if (status) {
      const sf = statusFilter(status);
      if (sf) and.push(sf);
    }

    const priority = sp.get('priority');
    if (priority === 'high') and.push({ is_high_priority: true });
    else if (priority === 'normal') and.push({ is_high_priority: false });

    if (sp.get('featured') === 'true') and.push({ is_featured: true });

    const filter = and.length > 0 ? { $and: and } : {};

    const allowedSort = { title: 'title', start_date: 'start_date', date_range: 'start_date' };
    const sortField = allowedSort[sp.get('sort_field')] || 'createdAt';
    const sortDir = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const [announcements, total] = await Promise.all([
      Announcement.find(filter)
        .populate('branch_ids', 'name')
        .populate('department_ids', 'name')
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(perPage),
      Announcement.countDocuments(filter),
    ]);
    return Response.json(
      { announcements, pagination: { page, limit: perPage, total, pages: Math.ceil(total / perPage) || 1 } },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching announcements');
  }
}

function validateAudience(body) {
  const companyWide = body.is_company_wide === undefined ? true : Boolean(body.is_company_wide);
  const branches = Array.isArray(body.branch_ids) ? body.branch_ids : [];
  const depts = Array.isArray(body.department_ids) ? body.department_ids : [];
  if (!companyWide && branches.length === 0 && depts.length === 0) {
    return 'Select at least one branch or department when the announcement is not company-wide';
  }
  for (const b of branches) {
    if (!mongoose.Types.ObjectId.isValid(b)) return 'Invalid branch id in branch_ids';
  }
  for (const d of depts) {
    if (!mongoose.Types.ObjectId.isValid(d)) return 'Invalid department id in department_ids';
  }
  return null;
}

export async function POST(request) {
  try {
    await requireAuth(request);
    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, [
      { field: 'title', required: true, trim: true, messages: { required: 'Announcement title is required' } },
      { field: 'category', required: true, isIn: CATEGORIES, messages: { required: 'Category is required', isIn: 'Category is invalid' } },
      { field: 'description', optional: true, trim: true },
      { field: 'content', required: true, messages: { required: 'Content is required' } },
      { field: 'start_date', required: true, isISO8601: true, messages: { required: 'Start date is required', isISO8601: 'Start date must be a valid date' } },
      { field: 'end_date', optional: true },
      { field: 'attachments', optional: true, trim: true },
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
    const audienceError = validateAudience(body);
    if (audienceError) return Response.json({ message: audienceError }, { status: 400 });
    await connectDB();
    const companyWide = body.is_company_wide === undefined ? true : Boolean(body.is_company_wide);
    const announcement = await Announcement.create({
      title: data.title,
      category: data.category,
      description: data.description ?? null,
      content: data.content,
      start_date: data.start_date,
      end_date: data.end_date || null,
      attachments: data.attachments ?? null,
      is_featured: Boolean(body.is_featured),
      is_high_priority: Boolean(body.is_high_priority),
      is_company_wide: companyWide,
      branch_ids: companyWide ? [] : body.branch_ids || [],
      department_ids: companyWide ? [] : body.department_ids || [],
    });
    return Response.json({ message: 'Announcement created successfully', announcement }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating announcement');
  }
}
