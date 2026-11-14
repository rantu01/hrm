'use client';

import HrCrudPage from '@/components/hr/hr-crud-page';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

export default function ContractTypesPage() {
  return (
    <HrCrudPage
      title="Contract Types"
      description="Manage contract types and categories"
      apiEndpoint="/api/contracts/types"
      itemKey="contractTypes"
      searchPlaceholder="Search contract types..."
      createLabel="Add Contract Type"
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
          name: 'is_renewable',
          label: 'Renewable',
          placeholder: 'All',
          staticOptions: BOOLEAN_OPTIONS,
        },
      ]}
      columns={[
        { key: 'name', label: 'Name', sortable: true },
        { key: 'default_duration_months', label: 'Duration (months)', sortable: true },
        { key: 'probation_period_months', label: 'Probation (months)' },
        { key: 'notice_period_days', label: 'Notice (days)' },
        { key: 'is_renewable', label: 'Renewable' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created At', sortable: true },
      ]}
      fields={[
        { name: 'name', label: 'Contract Type Name', type: 'text', required: true, placeholder: 'e.g. Full-time, Part-time' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Enter description...' },
        { name: 'default_duration_months', label: 'Default Duration (months)', type: 'number', placeholder: 'e.g. 12' },
        { name: 'probation_period_months', label: 'Probation Period (months)', type: 'number', required: true, placeholder: '0' },
        { name: 'notice_period_days', label: 'Notice Period (days)', type: 'number', required: true, placeholder: '0' },
        {
          name: 'is_renewable',
          label: 'Renewable',
          type: 'select',
          placeholder: 'Select',
          options: BOOLEAN_OPTIONS,
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
        title: 'Contract Type Details',
        fields: [
          { key: 'name', label: 'Name' },
          { key: 'description', label: 'Description' },
          { key: 'default_duration_months', label: 'Default Duration (months)' },
          { key: 'probation_period_months', label: 'Probation Period (months)' },
          { key: 'notice_period_days', label: 'Notice Period (days)' },
          { key: 'is_renewable', label: 'Renewable' },
          { key: 'status', label: 'Status', type: 'badge' },
          { key: 'createdAt', label: 'Created At', type: 'date' },
        ],
      }}
    />
  );
}