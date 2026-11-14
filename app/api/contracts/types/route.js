import connectDB from '@/lib/db';
import ContractType from '@/lib/models/ContractType';
import { requireAuth, handleApiError } from '@/lib/auth';

const SORT_MAP = {
  id: '_id',
  name: 'name',
  status: 'status',
  default_duration_months: 'default_duration_months',
  probation_period_months: 'probation_period_months',
  notice_period_days: 'notice_period_days',
  is_renewable: 'is_renewable',
  created_at: 'createdAt',
  createdAt: 'createdAt',
};

export async function GET(request) {
  try {
    await requireAuth(request);
    await connectDB();
    const sp = request.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get('page'), 10) || 1, 1);
    const limit = Math.max(parseInt(sp.get('per_page'), 10) || parseInt(sp.get('limit'), 10) || 10, 1);
    const skip = (page - 1) * limit;

    const search = (sp.get('search') || '').trim();
    const baseFilter = {};
    if (search) {
      const rx = { $regex: search, $options: 'i' };
      baseFilter.$or = [{ name: rx }, { description: rx }];
    }

    const isRenewable = sp.get('is_renewable');
    if (isRenewable && isRenewable !== 'all' && isRenewable !== '') {
      baseFilter.is_renewable = isRenewable === 'true';
    }

    const status = sp.get('status');
    const filter = { ...baseFilter };
    if (status && status !== 'all' && status !== '' && status !== '_empty_') {
      filter.status = status;
    }

    const sortField = SORT_MAP[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const [items, total, all, active, inactive] = await Promise.all([
      ContractType.find(filter).sort({ [sortField]: sortDirection }).skip(skip).limit(limit),
      ContractType.countDocuments(filter),
      ContractType.countDocuments(baseFilter),
      ContractType.countDocuments({ ...baseFilter, status: 'active' }),
      ContractType.countDocuments({ ...baseFilter, status: 'inactive' }),
    ]);

    return Response.json(
      {
        contractTypes: items,
        statusCounts: { all, active, inactive },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching contract types');
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const body = await request.json();
    const { name, description, default_duration_months, probation_period_months, notice_period_days, is_renewable, status } = body || {};
    if (!name) return Response.json({ message: 'Name is required' }, { status: 400 });
    const ct = await ContractType.create({
      name,
      description: description || null,
      default_duration_months: default_duration_months ? Number(default_duration_months) : null,
      probation_period_months: probation_period_months !== undefined && probation_period_months !== '' ? Number(probation_period_months) : 0,
      notice_period_days: notice_period_days !== undefined && notice_period_days !== '' ? Number(notice_period_days) : 0,
      is_renewable: is_renewable === true || is_renewable === 'true',
      status: status || 'active',
      created_by: user._id,
    });
    return Response.json({ message: 'Contract type created successfully', contractType: ct }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating contract type');
  }
}