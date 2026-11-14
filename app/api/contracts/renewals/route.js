import connectDB from '@/lib/db';
import ContractRenewal from '@/lib/models/ContractRenewal';
import EmployeeContract from '@/lib/models/EmployeeContract';
import User from '@/lib/models/User';
import { requireAuth, handleApiError } from '@/lib/auth';

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
      baseFilter.renewal_number = rx;
    }
    const status = sp.get('status');
    const filter = { ...baseFilter };
    if (status && status !== 'all' && status !== '' && status !== '_empty_') {
      filter.status = status;
    }
    const contractId = sp.get('contract_id');
    if (contractId && contractId !== 'all' && contractId !== '') {
      filter.contract_id = contractId;
    }

    const [items, total] = await Promise.all([
      ContractRenewal.find(filter)
        .populate({ path: 'contract_id', populate: { path: 'employee_id', select: 'name email' } })
        .populate('requested_by', 'name')
        .populate('approved_by', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ContractRenewal.countDocuments(filter),
    ]);

    const contracts = await EmployeeContract.find({ end_date: { $ne: null } })
      .populate('employee_id', 'name')
      .select('_id contract_number employee_id end_date')
      .sort({ createdAt: -1 })
      .limit(100);
    const employees = await User.find({}).select('_id name').limit(100);

    return Response.json(
      {
        contractRenewals: items,
        contracts,
        employees,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching contract renewals');
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const body = await request.json();
    const { contract_id, new_start_date, new_end_date, new_basic_salary, new_allowances, new_benefits, new_terms_conditions, changes_summary, reason, requested_by } = body || {};
    if (!contract_id || !new_start_date || !new_end_date || new_basic_salary === undefined || !requested_by) {
      return Response.json({ message: 'Missing required fields' }, { status: 400 });
    }
    const contract = await EmployeeContract.findById(contract_id);
    if (!contract) return Response.json({ message: 'Contract not found' }, { status: 400 });

    const last = await ContractRenewal.findOne({ contract_id }).sort({ createdAt: -1 });
    let nextNumber = 1;
    if (last && last.renewal_number) {
      const m = last.renewal_number.match(/(\d{2})$/);
      if (m) nextNumber = parseInt(m[1], 10) + 1;
    }
    const renewalNumber = `REN-${String(user._id).slice(-3).padStart(3, '0')}-${String(contract_id).slice(-3).padStart(3, '0')}-${String(nextNumber).padStart(2, '0')}`;

    const doc = await ContractRenewal.create({
      contract_id,
      renewal_number: renewalNumber,
      current_end_date: contract.end_date,
      new_start_date,
      new_end_date,
      new_basic_salary: Number(new_basic_salary),
      new_allowances: Array.isArray(new_allowances) ? new_allowances : [],
      new_benefits: Array.isArray(new_benefits) ? new_benefits : [],
      new_terms_conditions: new_terms_conditions || null,
      changes_summary: changes_summary || null,
      reason: reason || null,
      requested_by,
      created_by: user._id,
    });
    const populated = await ContractRenewal.findById(doc._id)
      .populate({ path: 'contract_id', populate: { path: 'employee_id', select: 'name email' } })
      .populate('requested_by', 'name')
      .populate('approved_by', 'name');
    return Response.json({ message: 'Contract renewal created successfully', contractRenewal: populated }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating contract renewal');
  }
}