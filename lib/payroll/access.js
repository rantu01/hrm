import { ApiError, getUserPermissions, requireAuth } from '@/lib/auth';
import Employee from '@/lib/models/Employee';

// Permission groups used by the payroll module. Each capability accepts both
// the granular permissions used by the reference module and the legacy
// permissions created with the first payroll implementation. This keeps
// existing roles working after the upgrade.
export const PAYROLL_PERMISSIONS = {
  viewRuns: ['view-payroll-runs', 'view-payroll', 'manage-payroll'],
  createRuns: ['create-payroll-runs', 'create-payroll'],
  editRuns: ['edit-payroll-runs', 'edit-payroll'],
  deleteRuns: ['delete-payroll-runs', 'delete-payroll'],
  processRuns: ['process-payroll-runs', 'approve-payroll', 'create-payroll'],
  viewComponents: ['view-salary-components', 'view-payroll', 'manage-payroll'],
  createComponents: ['create-salary-components', 'create-payroll'],
  editComponents: ['edit-salary-components', 'edit-payroll'],
  deleteComponents: ['delete-salary-components', 'delete-payroll'],
  viewEmployeeSalaries: [
    'view-employee-salaries',
    'view-payroll',
    'manage-payroll',
  ],
  createEmployeeSalaries: ['create-employee-salaries', 'create-payroll'],
  editEmployeeSalaries: ['edit-employee-salaries', 'edit-payroll'],
  deleteEmployeeSalaries: ['delete-employee-salaries', 'delete-payroll'],
  viewPayslips: ['view-payslips', 'view-payroll', 'manage-payroll'],
  generatePayslips: [
    'create-payslips',
    'generate-payslips',
    'process-payroll-runs',
    'approve-payroll',
  ],
  downloadPayslips: [
    'download-payslips',
    'view-payslips',
    'view-payroll',
    'manage-payroll',
  ],
  deletePayslips: ['delete-payslips', 'delete-payroll'],
};

export function hasAnyPermission(permissions, values) {
  return values.some((value) => permissions.includes(value));
}

function capabilityName(key) {
  return `can${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function buildCapabilities(permissions) {
  return Object.fromEntries(
    Object.entries(PAYROLL_PERMISSIONS).map(([key, values]) => [
      capabilityName(key),
      hasAnyPermission(permissions, values),
    ])
  );
}

export function isPayrollManager(user, permissions) {
  if (!user) return false;
  if (user.type === 'superadmin' || user.type === 'admin') return true;
  return hasAnyPermission(permissions, [
    ...PAYROLL_PERMISSIONS.viewRuns,
    ...PAYROLL_PERMISSIONS.viewComponents,
    ...PAYROLL_PERMISSIONS.viewEmployeeSalaries,
    ...PAYROLL_PERMISSIONS.viewPayslips,
    ...PAYROLL_PERMISSIONS.processRuns,
  ]);
}

/**
 * Resolve the signed-in user's payroll capabilities and linked employee
 * record. Employees without any payroll management permission can still view
 * and download their own payslips.
 */
export async function getPayrollAccess(request) {
  const user = await requireAuth(request);
  const permissions = await getUserPermissions(user);
  const capabilities = buildCapabilities(permissions);
  const manager = isPayrollManager(user, permissions);

  let linkedEmployee = null;
  if (user?._id) {
    linkedEmployee = await Employee.findOne({ user: user._id })
      .select('_id name employee_id email branch_id base_salary profile_image')
      .lean();
  }

  const canViewAllPayslips = manager;
  const canViewOwnPayslips = Boolean(linkedEmployee);

  return {
    ...capabilities,
    isManager: manager,
    canViewAllPayslips,
    canViewOwnPayslips,
    linkedEmployee: linkedEmployee
      ? {
          ...linkedEmployee,
          _id: String(linkedEmployee._id),
        }
      : null,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      type: user.type,
      role: user.role,
    },
    permissions,
  };
}

/**
 * Require at least one of the permissions mapped to a capability key.
 */
export async function requirePayrollPermission(request, capabilityKey) {
  const values = PAYROLL_PERMISSIONS[capabilityKey];
  if (!values) throw new ApiError(500, 'Unknown payroll capability');

  const user = await requireAuth(request);
  if (user.type === 'superadmin' || user.type === 'admin') return user;

  const permissions = await getUserPermissions(user);
  if (!hasAnyPermission(permissions, values)) {
    throw new ApiError(403, 'You do not have permission to perform this action');
  }
  return user;
}
