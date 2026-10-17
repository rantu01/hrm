'use client';

import HrCrudPage from '@/components/hr/hr-crud-page';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function BranchesPage() {
  return (
    <HrCrudPage
      title="Branches"
      description="Manage company branches and locations"
      apiEndpoint="/api/branches"
      itemKey="branches"
      searchPlaceholder="Search branches..."
      createLabel="Add Branch"
      sortable
      perPageOptions={[10, 25, 50, 100]}
      toggleStatus
      columns={[
        {
          key: 'name',
          label: 'Name',
          sortable: true,
          render: (value, row) => (
            <div>
              <div className="font-medium">{value || '—'}</div>
              {row.email && (
                <div className="text-sm text-muted-foreground">{row.email}</div>
              )}
            </div>
          ),
        },
        { key: 'phone', label: 'Contact' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created At', sortable: true },
      ]}
      fields={[
        { name: 'name', label: 'Branch Name', type: 'text', required: true, placeholder: 'e.g. Head Office, New York Branch' },
        { name: 'address', label: 'Address', type: 'textarea', placeholder: 'e.g. 123 Main Street, Suite 100' },
        { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. New York' },
        { name: 'state', label: 'State/Province', type: 'text', placeholder: 'e.g. New York' },
        { name: 'country', label: 'Country', type: 'text', placeholder: 'e.g. United States' },
        { name: 'zip_code', label: 'ZIP/Postal Code', type: 'text', placeholder: 'e.g. 10001' },
        { name: 'phone', label: 'Phone', type: 'text', placeholder: 'e.g. +1 234 567 8900' },
        { name: 'email', label: 'Email', type: 'email', placeholder: 'e.g. branch@example.com' },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          placeholder: 'Select status',
          options: STATUS_OPTIONS,
        },
      ]}
      viewConfig={{
        title: 'Branch Details',
        fields: [
          { key: 'name', label: 'Branch Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'address', label: 'Address' },
          { key: 'city', label: 'City' },
          { key: 'state', label: 'State/Province' },
          { key: 'country', label: 'Country' },
          { key: 'zip_code', label: 'ZIP/Postal Code' },
          { key: 'status', label: 'Status', type: 'badge' },
          { key: 'createdAt', label: 'Created At', type: 'date' },
        ],
      }}
    />
  );
}
