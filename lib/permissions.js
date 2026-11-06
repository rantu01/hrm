import mongoose from 'mongoose';

// Static permission catalog for the application. Roles store an array of
// these permission strings; keep values stable once assigned.

// Builds a standard View/Create/Edit/Delete permission group for an entity.
const crud = (group, entity, extra = []) => ({
  group,
  permissions: [
    { value: `view-${entity}`, label: 'View' },
    { value: `create-${entity}`, label: 'Create' },
    { value: `edit-${entity}`, label: 'Edit' },
    { value: `delete-${entity}`, label: 'Delete' },
    ...extra,
  ],
});

export const PERMISSION_GROUPS = [
  {
    group: 'Dashboard',
    permissions: [{ value: 'view-dashboard', label: 'View Dashboard' }],
  },
  {
    group: 'Branches',
    permissions: [
      { value: 'view-branches', label: 'View' },
      { value: 'create-branches', label: 'Create' },
      { value: 'edit-branches', label: 'Edit' },
      { value: 'delete-branches', label: 'Delete' },
      { value: 'toggle-status-branches', label: 'Toggle Status' },
    ],
  },
  {
    group: 'Departments',
    permissions: [
      { value: 'view-departments', label: 'View' },
      { value: 'create-departments', label: 'Create' },
      { value: 'edit-departments', label: 'Edit' },
      { value: 'delete-departments', label: 'Delete' },
      { value: 'toggle-status-departments', label: 'Toggle Status' },
    ],
  },
  {
    group: 'Designations',
    permissions: [
      { value: 'view-designations', label: 'View' },
      { value: 'create-designations', label: 'Create' },
      { value: 'edit-designations', label: 'Edit' },
      { value: 'delete-designations', label: 'Delete' },
      { value: 'toggle-status-designations', label: 'Toggle Status' },
    ],
  },
  {
    group: 'Employees',
    permissions: [
      { value: 'view-employees', label: 'View' },
      { value: 'create-employees', label: 'Create' },
      { value: 'edit-employees', label: 'Edit' },
      { value: 'delete-employees', label: 'Delete' },
      { value: 'toggle-status-employees', label: 'Toggle Status' },
    ],
  },
  {
    group: 'Holidays',
    permissions: [
      { value: 'view-holidays', label: 'View' },
      { value: 'create-holidays', label: 'Create' },
      { value: 'edit-holidays', label: 'Edit' },
      { value: 'delete-holidays', label: 'Delete' },
    ],
  },
  {
    group: 'Announcements',
    permissions: [
      { value: 'view-announcements', label: 'View' },
      { value: 'create-announcements', label: 'Create' },
      { value: 'edit-announcements', label: 'Edit' },
      { value: 'delete-announcements', label: 'Delete' },
    ],
  },
  {
    group: 'Leave Management',
    permissions: [
      { value: 'view-leave', label: 'View Own Leave' },
      { value: 'create-leave', label: 'Apply for Leave' },
      { value: 'edit-leave', label: 'Edit Leave Requests' },
      { value: 'delete-leave', label: 'Delete Leave Requests' },
      { value: 'manage-leave', label: 'View / Manage All Requests' },
      { value: 'approve-leave', label: 'Approve / Reject Requests' },
      { value: 'manage-leave-types', label: 'Manage Leave Types' },
      { value: 'manage-leave-balances', label: 'Manage Leave Balances' },
    ],
  },
  {
    group: 'Performance Indicators',
    permissions: [
      { value: 'view-indicators', label: 'View' },
      { value: 'create-indicators', label: 'Create' },
      { value: 'edit-indicators', label: 'Edit' },
      { value: 'delete-indicators', label: 'Delete' },
      { value: 'toggle-status-indicators', label: 'Toggle Status' },
    ],
  },
  {
    group: 'Indicator Categories',
    permissions: [
      { value: 'view-indicator-categories', label: 'View' },
      { value: 'create-indicator-categories', label: 'Create' },
      { value: 'edit-indicator-categories', label: 'Edit' },
      { value: 'delete-indicator-categories', label: 'Delete' },
      { value: 'toggle-status-indicator-categories', label: 'Toggle Status' },
    ],
  },
  {
    group: 'Goal Types',
    permissions: [
      { value: 'view-goal-types', label: 'View' },
      { value: 'create-goal-types', label: 'Create' },
      { value: 'edit-goal-types', label: 'Edit' },
      { value: 'delete-goal-types', label: 'Delete' },
      { value: 'toggle-status-goal-types', label: 'Toggle Status' },
    ],
  },
  {
    group: 'Employee Goals',
    permissions: [
      { value: 'view-employee-goals', label: 'View' },
      { value: 'create-employee-goals', label: 'Create' },
      { value: 'edit-employee-goals', label: 'Edit' },
      { value: 'delete-employee-goals', label: 'Delete' },
    ],
  },
  {
    group: 'Review Cycles',
    permissions: [
      { value: 'view-review-cycles', label: 'View' },
      { value: 'create-review-cycles', label: 'Create' },
      { value: 'edit-review-cycles', label: 'Edit' },
      { value: 'delete-review-cycles', label: 'Delete' },
      { value: 'toggle-status-review-cycles', label: 'Toggle Status' },
    ],
  },
  {
    group: 'Employee Reviews',
    permissions: [
      { value: 'view-employee-reviews', label: 'View' },
      { value: 'create-employee-reviews', label: 'Create' },
      { value: 'edit-employee-reviews', label: 'Edit' },
      { value: 'delete-employee-reviews', label: 'Delete' },
    ],
  },
  {
    group: 'Recruitment',
    permissions: [{ value: 'view-recruitment', label: 'View Dashboard' }],
  },
  crud('Job Postings', 'job-postings', [{ value: 'publish-job-postings', label: 'Publish / Unpublish' }]),
  crud('Candidates', 'candidates'),
  crud('Interviews', 'interviews'),
  crud('Interview Feedback', 'interview-feedback'),
  crud('Offers', 'offers', [{ value: 'approve-offers', label: 'Approve / Update Status' }]),
  crud('Candidate Onboarding', 'candidate-onboarding', [
    { value: 'manage-candidate-onboarding-status', label: 'Update Onboarding Status' },
  ]),
  crud('Candidate Assessments', 'candidate-assessments'),
  crud('Onboarding Checklists', 'onboarding-checklists'),
  crud('Checklist Items', 'checklist-items'),
  crud('Job Categories', 'job-categories'),
  crud('Job Types', 'job-types'),
  crud('Job Locations', 'job-locations'),
  crud('Candidate Sources', 'candidate-sources'),
  crud('Interview Types', 'interview-types'),
  crud('Interview Rounds', 'interview-rounds'),
  crud('Offer Templates', 'offer-templates'),
  crud('Custom Questions', 'custom-questions'),
  {
    group: 'Users',
    permissions: [
      { value: 'view-users', label: 'View' },
      { value: 'create-users', label: 'Create' },
      { value: 'edit-users', label: 'Edit' },
      { value: 'delete-users', label: 'Delete' },
      { value: 'toggle-status-users', label: 'Toggle Status' },
      { value: 'reset-password-users', label: 'Reset Password' },
    ],
  },
  {
    group: 'Roles',
    permissions: [
      { value: 'view-roles', label: 'View' },
      { value: 'create-roles', label: 'Create' },
      { value: 'edit-roles', label: 'Edit' },
      { value: 'delete-roles', label: 'Delete' },
      { value: 'toggle-status-roles', label: 'Toggle Status' },
    ],
  },
  {
    group: 'Payroll Management',
    permissions: [
      { value: 'view-payroll', label: 'View Payroll' },
      { value: 'view-payroll-runs', label: 'View Payroll Runs' },
      { value: 'create-payroll-runs', label: 'Create Payroll Runs' },
      { value: 'edit-payroll-runs', label: 'Edit Payroll Runs' },
      { value: 'delete-payroll-runs', label: 'Delete Payroll Runs' },
      { value: 'process-payroll-runs', label: 'Process Payroll Runs' },
      { value: 'view-salary-components', label: 'View Salary Components' },
      { value: 'create-salary-components', label: 'Create Salary Components' },
      { value: 'edit-salary-components', label: 'Edit Salary Components' },
      { value: 'delete-salary-components', label: 'Delete Salary Components' },
      { value: 'view-employee-salaries', label: 'View Employee Salaries' },
      { value: 'create-employee-salaries', label: 'Create Employee Salaries' },
      { value: 'edit-employee-salaries', label: 'Edit Employee Salaries' },
      { value: 'delete-employee-salaries', label: 'Delete Employee Salaries' },
      { value: 'view-payslips', label: 'View Payslips' },
      { value: 'create-payslips', label: 'Generate Payslips' },
      { value: 'download-payslips', label: 'Download Payslips' },
      { value: 'delete-payslips', label: 'Delete Payslips' },
      { value: 'create-payroll', label: 'Generate Payroll (Legacy)' },
      { value: 'edit-payroll', label: 'Edit Payroll (Legacy)' },
      { value: 'delete-payroll', label: 'Delete Payroll (Legacy)' },
      { value: 'approve-payroll', label: 'Approve Payroll (Legacy)' },
      { value: 'generate-payslips', label: 'Generate Payslips (Legacy)' },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.value)
);

export function isValidPermission(value) {
  return ALL_PERMISSIONS.includes(value);
}

// System roles seeded on first use. Super Admin always holds every permission.
export function defaultSystemRoles() {
  return [
    {
      name: 'Super Admin',
      description: 'Full access to all modules and settings.',
      permissions: [...ALL_PERMISSIONS],
      status: 'active',
      isSystem: true,
    },
    {
      name: 'Employee',
      description: 'Standard access for regular employees.',
      permissions: [
        'view-dashboard',
        'view-branches',
        'view-departments',
        'view-designations',
        'view-employees',
        'view-holidays',
        'view-announcements',
        'view-leave',
        'create-leave',
        'view-indicators',
        'view-indicator-categories',
        'view-goal-types',
        'view-employee-goals',
        'view-review-cycles',
        'view-employee-reviews',
      ],
      status: 'active',
      isSystem: true,
    },
  ];
}
