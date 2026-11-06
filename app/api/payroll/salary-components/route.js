import connectDB from '@/lib/db';
import SalaryComponent from '@/lib/models/SalaryComponent';
import { handleApiError } from '@/lib/auth';
import {
  getPayrollAccess,
  requirePayrollPermission,
} from '@/lib/payroll/access';
import { parseJsonBody } from '@/lib/validation';

const TYPES = ['earning', 'deduction'];
const CALCULATION_TYPES = ['fixed', 'percentage'];
const STATUSES = ['active', 'inactive'];

function normalise(payload) {
  const calculationType = CALCULATION_TYPES.includes(payload.calculationType)
    ? payload.calculationType
    : 'fixed';
  return {
    name: String(payload.name || '').trim(),
    description: payload.description ? String(payload.description).trim() : null,
    type: TYPES.includes(payload.type) ? payload.type : 'earning',
    calculationType,
    defaultAmount: calculationType === 'fixed' ? Math.max(0, Number(payload.defaultAmount) || 0) : 0,
    percentageOfBasic:
      calculationType === 'percentage'
        ? Math.min(100, Math.max(0, Number(payload.percentageOfBasic) || 0))
        : null,
    isTaxable: payload.isTaxable === undefined ? true : Boolean(payload.isTaxable),
    isMandatory: Boolean(payload.isMandatory),
    status: STATUSES.includes(payload.status) ? payload.status : 'active',
  };
}

function validate(data) {
  if (!data.name) return 'Component name is required';
  if (data.name.length > 255) return 'Name cannot exceed 255 characters';
  if (data.calculationType === 'percentage' && data.percentageOfBasic == null) {
    return 'Percentage of basic salary is required';
  }
  return null;
}

export async function GET(request) {
  try {
    const access = await getPayrollAccess(request);
    if (!access.canViewComponents) {
      return Response.json(
        { message: 'You do not have permission to view salary components' },
        { status: 403 }
      );
    }
    await connectDB();

    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page'), 10) || 1);
    const perPage = Math.max(
      1,
      parseInt(sp.get('per_page'), 10) || parseInt(sp.get('limit'), 10) || 10
    );
    const skip = (page - 1) * perPage;

    const filter = {};
    const search = (sp.get('search') || '').trim();
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const type = sp.get('type');
    if (type && TYPES.includes(type)) filter.type = type;
    const calculationType = sp.get('calculation_type') || sp.get('calculationType');
    if (calculationType && CALCULATION_TYPES.includes(calculationType)) {
      filter.calculationType = calculationType;
    }
    const status = sp.get('status');
    if (status && STATUSES.includes(status)) filter.status = status;

    const sortField =
      sp.get('sort_field') === 'name'
        ? { name: sp.get('sort_direction') === 'desc' ? -1 : 1 }
        : { createdAt: -1 };

    const [components, total] = await Promise.all([
      SalaryComponent.find(filter).sort(sortField).skip(skip).limit(perPage).lean(),
      SalaryComponent.countDocuments(filter),
    ]);

    return Response.json({
      components,
      pagination: {
        page,
        limit: perPage,
        total,
        pages: Math.ceil(total / perPage) || 1,
      },
      access,
    });
  } catch (error) {
    return handleApiError(error, 'Server error fetching salary components');
  }
}

export async function POST(request) {
  try {
    const user = await requirePayrollPermission(request, 'createComponents');
    await connectDB();
    const body = await parseJsonBody(request);
    const data = normalise(body);
    const error = validate(data);
    if (error) return Response.json({ message: error }, { status: 400 });

    const component = await SalaryComponent.create({
      ...data,
      createdBy: user._id,
      updatedBy: user._id,
    });
    return Response.json(
      { message: 'Salary component created successfully', component },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error creating salary component');
  }
}
