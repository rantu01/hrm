'use client';

import HrCrudPage from '@/components/hr/hr-crud-page';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function DepartmentsPage() {
  return (
    <HrCrudPage
      title="Departments"
      description="Manage company departments and structure"
      apiEndpoint="/api/departments"
      itemKey="departments"
      searchPlaceholder="Search departments..."
      createLabel="Add Department"
      sortable
      perPageOptions={[10, 25, 50, 100]}
      toggleStatus
      statusTabs={{
        tabs: [
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
      }}
      filters={[
        {
          name: 'branch_id',
          label: 'Branch',
          placeholder: 'All Branches',
          optionsEndpoint: '/api/branches',
          optionsKey: 'branches',
        },
      ]}
      columns={[
        { key: 'name', label: 'Name', sortable: true },
        { key: 'branch_id.name', label: 'Branch' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created At', sortable: true },
      ]}
      fields={[
        { name: 'name', label: 'Department Name', type: 'text', required: true, placeholder: 'e.g. Human Resources, Finance, Engineering' },
        {
          name: 'branch_id',
          label: 'Branch',
          type: 'select',
          required: true,
          placeholder: 'Select branch',
          optionsEndpoint: '/api/branches',
          optionsKey: 'branches',
        },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Enter department description...' },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          placeholder: 'Select status',
          options: STATUS_OPTIONS,
        },
      ]}
      viewConfig={{
        title: 'Department Details',
        fields: [
          { key: 'name', label: 'Department Name' },
          { key: 'branch_id.name', label: 'Branch' },
          { key: 'description', label: 'Description' },
          { key: 'status', label: 'Status', type: 'badge' },
          { key: 'createdAt', label: 'Created At', type: 'date' },
        ],
      }}
    />
  );
}
