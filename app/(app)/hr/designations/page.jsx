'use client';

import HrCrudPage from '@/components/hr/hr-crud-page';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function DesignationsPage() {
  return (
    <HrCrudPage
      title="Designations"
      description="Manage job designations and roles within your organization"
      apiEndpoint="/api/designations"
      itemKey="designations"
      searchPlaceholder="Search designations..."
      createLabel="Add Designation"
      sortable
      perPageOptions={[10, 25, 50, 100]}
      toggleStatus
      filters={[
        {
          name: 'department',
          label: 'Department',
          placeholder: 'All Departments',
          optionsEndpoint: '/api/departments',
          optionsKey: 'departments',
        },
      ]}
      columns={[
        { key: 'name', label: 'Name', sortable: true },
        {
          key: 'department_id.name',
          label: 'Department',
          render: (value, row) => (
            <div>
              <div>{value || '—'}</div>
              <div className="text-xs text-muted-foreground">
                Branch: {row?.department_id?.branch_id?.name || '-'}
              </div>
            </div>
          ),
        },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created At', sortable: true },
      ]}
      fields={[
        { name: 'name', label: 'Designation Name', type: 'text', required: true, placeholder: 'e.g. Software Engineer, HR Manager, Team Lead' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Enter designation description...' },
        {
          name: 'department_id',
          label: 'Department',
          type: 'select',
          required: true,
          placeholder: 'Select department',
          optionsEndpoint: '/api/departments',
          optionsKey: 'departments',
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          placeholder: 'Select status',
          options: STATUS_OPTIONS,
        },
      ]}
      viewConfig={{
        title: 'Designation Details',
        fields: [
          { key: 'name', label: 'Designation Name' },
          { key: 'department_id.name', label: 'Department' },
          { key: 'department_id.branch_id.name', label: 'Branch' },
          { key: 'description', label: 'Description' },
          { key: 'status', label: 'Status', type: 'badge' },
          { key: 'createdAt', label: 'Created At', type: 'date' },
        ],
      }}
    />
  );
}
