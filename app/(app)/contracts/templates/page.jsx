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

export default function ContractTemplatesPage() {
  return (
    <HrCrudPage
      title="Contract Templates"
      description="Manage contract templates"
      apiEndpoint="/api/contracts/templates"
      itemKey="contractTemplates"
      searchPlaceholder="Search templates..."
      createLabel="Add Contract Template"
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
          name: 'contract_type_id',
          label: 'Contract Type',
          placeholder: 'All Types',
          optionsEndpoint: '/api/contracts/types',
          optionsKey: 'contractTypes',
        },
        {
          name: 'is_default',
          label: 'Default',
          placeholder: 'All',
          staticOptions: BOOLEAN_OPTIONS,
        },
      ]}
      columns={[
        { key: 'name', label: 'Name', sortable: true },
        { key: 'contract_type_id.name', label: 'Contract Type' },
        { key: 'is_default', label: 'Default' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created At', sortable: true },
      ]}
      fields={[
        { name: 'name', label: 'Template Name', type: 'text', required: true, placeholder: 'Template name' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Enter description...' },
        {
          name: 'contract_type_id',
          label: 'Contract Type',
          type: 'select',
          required: true,
          placeholder: 'Select contract type',
          optionsEndpoint: '/api/contracts/types',
          optionsKey: 'contractTypes',
        },
        { name: 'template_content', label: 'Template Content', type: 'textarea', required: true, placeholder: 'Use {{variable}} placeholders' },
        { name: 'variables', label: 'Variables (comma-separated)', type: 'text', required: true, placeholder: 'employee_name,start_date' },
        { name: 'clauses', label: 'Clauses (comma-separated)', type: 'text', placeholder: 'clause1,clause2' },
        {
          name: 'is_default',
          label: 'Default',
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
        title: 'Contract Template Details',
        fields: [
          { key: 'name', label: 'Name' },
          { key: 'description', label: 'Description' },
          { key: 'contract_type_id.name', label: 'Contract Type' },
          { key: 'template_content', label: 'Template Content' },
          { key: 'variables', label: 'Variables' },
          { key: 'clauses', label: 'Clauses' },
          { key: 'is_default', label: 'Default' },
          { key: 'status', label: 'Status', type: 'badge' },
          { key: 'createdAt', label: 'Created At', type: 'date' },
        ],
      }}
    />
  );
}