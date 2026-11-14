'use client';

import HrCrudPage from '@/components/hr/hr-crud-page';

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Processed', label: 'Processed' },
];

export default function ContractRenewalsPage() {
  return (
    <HrCrudPage
      title="Contract Renewals"
      description="Manage contract renewals"
      apiEndpoint="/api/contracts/renewals"
      itemKey="contractRenewals"
      searchPlaceholder="Search renewals..."
      createLabel="Add Contract Renewal"
      sortable
      perPageOptions={[10, 25, 50, 100]}
      statusTabs={{
        tabs: [
          { value: 'all', label: 'All' },
          { value: 'Pending', label: 'Pending' },
          { value: 'Approved', label: 'Approved' },
          { value: 'Rejected', label: 'Rejected' },
          { value: 'Processed', label: 'Processed' },
        ],
      }}
      filters={[
        {
          name: 'contract_id',
          label: 'Contract',
          placeholder: 'All Contracts',
          optionsEndpoint: '/api/contracts/employee-contracts',
          optionsKey: 'employeeContracts',
          optionLabel: 'contract_number',
          optionValue: '_id',
        },
      ]}
      columns={[
        { key: 'renewal_number', label: 'Renewal No.', sortable: true },
        { key: 'contract_id.contract_number', label: 'Contract' },
        { key: 'new_start_date', label: 'New Start' },
        { key: 'new_end_date', label: 'New End' },
        { key: 'new_basic_salary', label: 'New Salary' },
        { key: 'status', label: 'Status' },
      ]}
      fields={[
        {
          name: 'contract_id',
          label: 'Contract',
          type: 'select',
          required: true,
          placeholder: 'Select contract',
          optionsEndpoint: '/api/contracts/employee-contracts',
          optionsKey: 'employeeContracts',
          optionLabel: 'contract_number',
          optionValue: '_id',
        },
        { name: 'new_start_date', label: 'New Start Date', type: 'date', required: true },
        { name: 'new_end_date', label: 'New End Date', type: 'date', required: true },
        { name: 'new_basic_salary', label: 'New Basic Salary', type: 'number', required: true, placeholder: '0' },
        { name: 'new_terms_conditions', label: 'New Terms & Conditions', type: 'textarea' },
        { name: 'changes_summary', label: 'Changes Summary', type: 'textarea' },
        { name: 'reason', label: 'Reason', type: 'textarea' },
        {
          name: 'requested_by',
          label: 'Requested By',
          type: 'select',
          required: true,
          placeholder: 'Select user',
          optionsEndpoint: '/api/users',
          optionsKey: 'users',
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
        title: 'Contract Renewal Details',
        fields: [
          { key: 'renewal_number', label: 'Renewal No.' },
          { key: 'contract_id.contract_number', label: 'Contract' },
          { key: 'current_end_date', label: 'Current End Date', type: 'date' },
          { key: 'new_start_date', label: 'New Start Date', type: 'date' },
          { key: 'new_end_date', label: 'New End Date', type: 'date' },
          { key: 'new_basic_salary', label: 'New Basic Salary' },
          { key: 'changes_summary', label: 'Changes Summary' },
          { key: 'reason', label: 'Reason' },
          { key: 'status', label: 'Status', type: 'badge' },
        ],
      }}
    />
  );
}