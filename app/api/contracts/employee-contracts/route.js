import connectDB from '@/lib/db';
import EmployeeContract from '@/lib/models/EmployeeContract';
import ContractType from '@/lib/models/ContractType';
import User from '@/lib/models/User';
import { requireAuth, handleApiError } from '@/lib/auth';

const SORT_MAP = {
  id: '_id',
  contract_number: 'contract_number',
  start_date: 'start_date',
  end_date: 'end_date',
  basic_salary: 'basic_salary',
  status: 'status',
  created_at: 'createdAt',
  createdAt: 'createdAt',
};

const STATUSES = ['Draft', 'Pending Approval', 'Active', 'Expired', 'Terminated', 'Renewed'];

export async function GET(request) {
  try {
    await requireAuth(request);
    await connectDB();
    const sp = request.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get('page'), 10) || 1, 1);
    const limit = Math.max(parseInt(sp.get('per_page'), 10) || parseInt(sp.get('limit'), 10) || 10, 1);
    const skip = (page - 1) * limit;

    // Auto-expire
    await EmployeeContract.updateMany(
      { status: 'Active', end_date: { $lt: new Date() } },
      { $set: { status: 'Expired' } }
    );

    const search = (sp.get('search') || '').trim();
    const baseFilter = {};
    if (search) {
      const rx = { $regex: search, $options: 'i' };
      baseFilter.$or = [{ contract_number: rx }];
    }

    const contractTypeId = sp.get('contract_type_id');
    if (contractTypeId && contractTypeId !== 'all' && contractTypeId !== '') {
      baseFilter.contract_type_id = contractTypeId;
    }
    const employeeId = sp.get('employee_id');
    if (employeeId && employeeId !== 'all' && employeeId !== '') {
      baseFilter.employee_id = employeeId;
    }

    const status = sp.get('status');
    const filter = { ...baseFilter };
    if (status && status !== 'all' && status !== '' && status !== '_empty_') {
      filter.status = status;
    }

    const sortField = SORT_MAP[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      EmployeeContract.find(filter)
        .populate('employee_id', 'name email avatar')
        .populate('contract_type_id', 'name')
        .populate('approved_by', 'name')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit),
      EmployeeContract.countDocuments(filter),
    ]);

    const statusCounts = { all: await EmployeeContract.countDocuments(baseFilter) };
    for (const s of STATUSES) {
      statusCounts[s] = await EmployeeContract.countDocuments({ ...baseFilter, status: s });
    }

    // stats
    const statsQuery = {};
    const activeCount = await EmployeeContract.countDocuments({ ...statsQuery, status: 'Active' });
    const nearExpiryCount = await EmployeeContract.countDocuments({
      status: 'Active',
      end_date: { $ne: null, $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), $gte: new Date() },
    });
    const draftCount = await EmployeeContract.countDocuments({ status: 'Draft' });

    return Response.json(
      {
        employeeContracts: items,
        statusCounts,
        stats: { active: activeCount, near_expiry: nearExpiryCount, draft: draftCount },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching employee contracts');
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const body = await request.json();
    const { employee_id, contract_type_id, start_date, end_date, basic_salary, benefits, terms_conditions, status } = body || {};
    if (!employee_id || !contract_type_id || !start_date || basic_salary === undefined) {
      return Response.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // auto end date from contract type if not provided
    let endDate = end_date || null;
    if (!endDate) {
      const ct = await ContractType.findById(contract_type_id);
      if (ct && ct.default_duration_months) {
        const d = new Date(start_date);
        d.setMonth(d.getMonth() + ct.default_duration_months);
        endDate = d.toISOString();
      }
    }

    // duplicate check
    const existing = await EmployeeContract.findOne({ employee_id, contract_type_id });
    if (existing) {
      return Response.json({ message: 'A contract with the same details already exists for this employee.' }, { status: 400 });
    }

    // contract number
    const last = await EmployeeContract.findOne().sort({ createdAt: -1 });
    let nextNumber = 1;
    if (last && last.contract_number) {
      const m = last.contract_number.match(/(\d{4})$/);
      if (m) nextNumber = parseInt(m[1], 10) + 1;
    }
    const contractNumber = `CON-${String(user._id).slice(-3).padStart(3, '0')}-${String(nextNumber).padStart(4, '0')}`;

    const doc = await EmployeeContract.create({
      contract_number: contractNumber,
      employee_id,
      contract_type_id,
      start_date,
      end_date: endDate,
      basic_salary: Number(basic_salary),
      benefits: Array.isArray(benefits) ? benefits : (benefits ? [benefits] : []),
      terms_conditions: terms_conditions || null,
      status: status || 'Draft',
      created_by: user._id,
    });
    const populated = await EmployeeContract.findById(doc._id)
      .populate('employee_id', 'name email avatar')
      .populate('contract_type_id', 'name')
      .populate('approved_by', 'name');
    return Response.json({ message: 'Employee contract created successfully', employeeContract: populated }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating employee contract');
  }
}