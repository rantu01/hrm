import connectDB from '@/lib/db';
import Candidate from '@/lib/models/Candidate';
import Offer from '@/lib/models/Offer';
import Employee from '@/lib/models/Employee';
import User from '@/lib/models/User';
import Branch from '@/lib/models/Branch';
import Department from '@/lib/models/Department';
import Designation from '@/lib/models/Designation';
import { handleApiError } from '@/lib/auth';
import { validateBody, parseJsonBody } from '@/lib/validation';
import { authorizeRecruitment, sanitize, isValidId, badRequest, notFound } from '@/lib/recruitment-server';

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'];

const CONVERT_RULES = [
  { field: 'name', required: true, trim: true, messages: { required: 'Name is required' } },
  {
    field: 'email',
    required: true,
    isEmail: true,
    normalizeEmail: true,
    messages: { required: 'Email is required', isEmail: 'Please provide a valid email' },
  },
  {
    field: 'password',
    required: true,
    minLength: 8,
    messages: { required: 'Password is required', minLength: 'Password must be at least 8 characters' },
  },
  { field: 'phone', required: true, trim: true, messages: { required: 'Phone is required' } },
  {
    field: 'date_of_birth',
    required: true,
    isISO8601: true,
    messages: { required: 'Date of birth is required', isISO8601: 'Date of birth must be a valid date' },
  },
  {
    field: 'gender',
    required: true,
    isIn: ['male', 'female', 'other'],
    messages: { required: 'Gender is required', isIn: 'Gender is invalid' },
  },
  { field: 'branch_id', required: true, messages: { required: 'Branch is required' } },
  { field: 'department_id', required: true, messages: { required: 'Department is required' } },
  { field: 'designation_id', required: true, messages: { required: 'Designation is required' } },
  {
    field: 'date_of_joining',
    required: true,
    isISO8601: true,
    messages: { required: 'Date of joining is required', isISO8601: 'Date of joining must be a valid date' },
  },
  {
    field: 'employment_type',
    required: true,
    trim: true,
    isIn: EMPLOYMENT_TYPES,
    messages: { required: 'Employment type is required', isIn: 'Employment type is invalid' },
  },
  { field: 'address_line_1', required: true, trim: true, messages: { required: 'Address is required' } },
  { field: 'city', required: true, trim: true, messages: { required: 'City is required' } },
  { field: 'state', required: true, trim: true, messages: { required: 'State is required' } },
  { field: 'country', required: true, trim: true, messages: { required: 'Country is required' } },
  { field: 'postal_code', required: true, trim: true, messages: { required: 'Postal code is required' } },
  {
    field: 'emergency_contact_name',
    required: true,
    trim: true,
    messages: { required: 'Emergency contact name is required' },
  },
  {
    field: 'relationship',
    required: true,
    trim: true,
    messages: { required: 'Emergency contact relationship is required' },
  },
  {
    field: 'number',
    required: true,
    trim: true,
    messages: { required: 'Emergency contact number is required' },
  },
  { field: 'bank_name', required: true, trim: true, messages: { required: 'Bank name is required' } },
  {
    field: 'account_holder_name',
    required: true,
    trim: true,
    messages: { required: 'Account holder name is required' },
  },
  { field: 'account_number', required: true, trim: true, messages: { required: 'Account number is required' } },
  {
    field: 'salary',
    required: true,
    isNumeric: true,
    messages: { required: 'Salary is required', isNumeric: 'Salary must be a number' },
  },
  // Optional employee fields
  {
    field: 'employee_status',
    optional: true,
    isIn: ['active', 'inactive', 'probation', 'terminated'],
    messages: { isIn: 'Employee status is invalid' },
  },
  { field: 'biometric_emp_id', optional: true, trim: true },
  { field: 'address_line_2', optional: true, trim: true },
  { field: 'bank_identifier_code', optional: true, trim: true },
  { field: 'bank_branch', optional: true, trim: true },
  { field: 'tax_payer_id', optional: true, trim: true },
  { field: 'profile_image', optional: true, trim: true },
];

// Collision-safe employee id generation (mirrors app/api/employees/route.js).
async function generateUniqueEmployeeId() {
  let employeeId = await Employee.generateEmployeeId();
  let guard = 0;
  while (await Employee.findOne({ employee_id: employeeId }).select('_id').lean()) {
    guard += 1;
    if (guard > 10) return null;
    const n = parseInt(employeeId.replace(/^EMP/, ''), 10) || 0;
    employeeId = `EMP${String(n + 1).padStart(6, '0')}`;
  }
  return employeeId;
}

// @route   GET /api/recruitment/candidates/[id]/convert-to-employee
// @desc    Conversion guards + form data (branches, departments, designations,
//          generated employee id) for the convert-to-employee page
// @access  Private (create-employees)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'create-employees');
    if (!isValidId(id)) return badRequest('Invalid candidate id');
    await connectDB();

    const candidate = await Candidate.findById(id).populate('job_id', 'title job_code').lean();
    if (!candidate) return notFound('Candidate not found');

    const [acceptedOffers, generatedEmployeeId] = await Promise.all([
      Offer.countDocuments({ candidate_id: id, status: 'Accepted' }),
      generateUniqueEmployeeId(),
    ]);

    const guards = {
      isHired: candidate.status === 'Hired',
      hasAcceptedOffer: acceptedOffers > 0,
      isEmployee: candidate.is_employee === true,
    };

    const [branches, departments, designations] = await Promise.all([
      Branch.find({ status: 'active' }).select('name').sort({ name: 1 }).lean(),
      Department.find({ status: 'active' }).select('name').sort({ name: 1 }).lean(),
      Designation.find({ status: 'active' }).select('name').sort({ name: 1 }).lean(),
    ]);

    return Response.json(
      { candidate, guards, branches, departments, designations, generatedEmployeeId },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error loading conversion form');
  }
}

// @route   POST /api/recruitment/candidates/[id]/convert-to-employee
// @desc    Convert a hired candidate into a User + Employee (mirrors the
//          employees POST: login account, generated employee id)
// @access  Private (create-employees)
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    await authorizeRecruitment(request, 'create-employees');
    if (!isValidId(id)) return badRequest('Invalid candidate id');

    const body = await parseJsonBody(request);
    const { errors, data } = validateBody(body, CONVERT_RULES);
    if (data.salary !== undefined && data.salary !== '' && Number(data.salary) < 0) {
      errors.push({ type: 'field', value: data.salary, msg: 'Salary cannot be negative', path: 'salary', location: 'body' });
    }
    if (errors.length > 0) return Response.json({ errors }, { status: 400 });

    const cleaned = sanitize(data);

    await connectDB();

    const candidate = await Candidate.findById(id).select('status is_employee').lean();
    if (!candidate) return notFound('Candidate not found');
    if (candidate.status !== 'Hired' || candidate.is_employee) {
      return badRequest('Invalid candidate status for conversion');
    }
    const acceptedOffers = await Offer.countDocuments({ candidate_id: id, status: 'Accepted' });
    if (acceptedOffers === 0) {
      return badRequest('Candidate must have an accepted offer before conversion');
    }

    // Every referenced document must exist
    const refMessages = [
      ['branch_id', Branch, 'Invalid branch selected'],
      ['department_id', Department, 'Invalid department selected'],
      ['designation_id', Designation, 'Invalid designation selected'],
    ];
    for (const [field, Model, message] of refMessages) {
      if (!isValidId(cleaned[field])) return badRequest(message);
      if (!(await Model.exists({ _id: cleaned[field] }))) return badRequest(message);
    }

    // The login account doubles as the employee's identity record
    const existingUser = await User.findOne({ email: cleaned.email }).select('_id').lean();
    if (existingUser) {
      return Response.json({ message: 'An account with this email already exists' }, { status: 409 });
    }
    const existingEmployee = await Employee.findOne({ email: cleaned.email }).select('_id').lean();
    if (existingEmployee) {
      return badRequest('Employee already exists with this email');
    }

    const employeeId = await generateUniqueEmployeeId();
    if (!employeeId) {
      return Response.json(
        { message: 'Could not generate a unique employee ID, please retry' },
        { status: 500 }
      );
    }

    const user = new User({
      name: cleaned.name,
      email: cleaned.email,
      password: cleaned.password,
      type: 'employee',
      role: 'employee',
    });
    await user.save();

    const employee = await Employee.create({
      user: user._id,
      employee_id: employeeId,
      name: cleaned.name,
      email: cleaned.email,
      phone: cleaned.phone,
      date_of_birth: cleaned.date_of_birth,
      gender: cleaned.gender,
      branch_id: cleaned.branch_id,
      department_id: cleaned.department_id,
      designation_id: cleaned.designation_id,
      date_of_joining: cleaned.date_of_joining,
      employment_type: cleaned.employment_type,
      ...(cleaned.employee_status ? { employee_status: cleaned.employee_status } : {}),
      address_line_1: cleaned.address_line_1,
      address_line_2: cleaned.address_line_2,
      city: cleaned.city,
      state: cleaned.state,
      country: cleaned.country,
      postal_code: cleaned.postal_code,
      emergency_contact_name: cleaned.emergency_contact_name,
      emergency_contact_relationship: cleaned.relationship,
      emergency_contact_number: cleaned.number,
      bank_name: cleaned.bank_name,
      account_holder_name: cleaned.account_holder_name,
      account_number: cleaned.account_number,
      bank_identifier_code: cleaned.bank_identifier_code,
      bank_branch: cleaned.bank_branch,
      tax_payer_id: cleaned.tax_payer_id,
      base_salary: Number(cleaned.salary),
      ...(cleaned.profile_image ? { profile_image: cleaned.profile_image } : {}),
      ...(cleaned.biometric_emp_id ? { biometric_emp_id: cleaned.biometric_emp_id } : {}),
    });

    await Candidate.findByIdAndUpdate(id, { $set: { is_employee: true } });

    const populated = await Employee.findById(employee._id)
      .populate('branch_id', 'name')
      .populate('department_id', 'name')
      .populate('designation_id', 'name')
      .populate('user', 'name email status')
      .lean();

    return Response.json(
      { message: 'Candidate converted to employee successfully', employee: populated },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return Response.json({ message: 'An account with this email already exists' }, { status: 409 });
    }
    return handleApiError(error, 'Server error converting candidate');
  }
}
