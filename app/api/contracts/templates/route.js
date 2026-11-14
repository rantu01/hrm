import connectDB from '@/lib/db';
import ContractTemplate from '@/lib/models/ContractTemplate';
import ContractType from '@/lib/models/ContractType';
import { requireAuth, handleApiError } from '@/lib/auth';

const SORT_MAP = {
  id: '_id',
  name: 'name',
  status: 'status',
  is_default: 'is_default',
  created_at: 'createdAt',
  createdAt: 'createdAt',
};

function toArray(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((x) => x.trim()).filter(Boolean);
  return [];
}

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
    const contractTypeId = sp.get('contract_type_id');
    if (contractTypeId && contractTypeId !== 'all' && contractTypeId !== '') {
      baseFilter.contract_type_id = contractTypeId;
    }
    const isDefault = sp.get('is_default');
    if (isDefault && isDefault !== 'all' && isDefault !== '') {
      baseFilter.is_default = isDefault === 'true';
    }

    const status = sp.get('status');
    const filter = { ...baseFilter };
    if (status && status !== 'all' && status !== '' && status !== '_empty_') {
      filter.status = status;
    }

    const sortField = SORT_MAP[sp.get('sort_field')] || 'createdAt';
    const sortDirection = sp.get('sort_direction') === 'asc' ? 1 : -1;

    const [items, total, all, active, inactive] = await Promise.all([
      ContractTemplate.find(filter)
        .populate('contract_type_id', 'name')
        .sort({ [sortField]: sortDirection, is_default: -1 })
        .skip(skip)
        .limit(limit),
      ContractTemplate.countDocuments(filter),
      ContractTemplate.countDocuments(baseFilter),
      ContractTemplate.countDocuments({ ...baseFilter, status: 'active' }),
      ContractTemplate.countDocuments({ ...baseFilter, status: 'inactive' }),
    ]);

    const contractTypes = await ContractType.find({ status: 'active' }).select('_id name').sort({ name: 1 });

    return Response.json(
      {
        contractTemplates: items,
        statusCounts: { all, active, inactive },
        contractTypes,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching contract templates');
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    await connectDB();
    const body = await request.json();
    const { name, description, contract_type_id, template_content, variables, clauses, is_default, status } = body || {};
    if (!name || !contract_type_id || !template_content) {
      return Response.json({ message: 'Missing required fields' }, { status: 400 });
    }
    const vArr = toArray(variables);
    if (vArr.length === 0) {
      return Response.json({ message: 'Variables are required' }, { status: 400 });
    }
    if (is_default === true || is_default === 'true') {
      await ContractTemplate.updateMany(
        { created_by: user._id, contract_type_id },
        { $set: { is_default: false } }
      );
    }
    const doc = await ContractTemplate.create({
      name,
      description: description || null,
      contract_type_id,
      template_content,
      variables: vArr,
      clauses: toArray(clauses),
      is_default: is_default === true || is_default === 'true',
      status: status || 'active',
      created_by: user._id,
    });
    const populated = await ContractTemplate.findById(doc._id).populate('contract_type_id', 'name');
    return Response.json({ message: 'Contract template created successfully', contractTemplate: populated }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Server error creating contract template');
  }
}