'use client';

import HrCrudPage from '@/components/hr/hr-crud-page';

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Pending Approval', label: 'Pending Approval' },
  { value: 'Active', label: 'Active' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Terminated', label: 'Terminated' },
  { value: 'Renewed', label: 'Renewed' },
];

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

function ContractStats() {
  const [stats, setStats] = useState({ active: 0, near_expiry: 0, draft: 0 });
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/contracts/employee-contracts?limit=1', { credentials: 'include' });
        const json = await res.json();
        if (json.stats) setStats(json.stats);
      } catch {}
    })();
  }, []);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Active Contracts</div>
        <div className="text-2xl font-semibold">{stats.active}</div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Near Expiry (30 days)</div>
        <div className="text-2xl font-semibold">{stats.near_expiry}</div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Draft Contracts</div>
        <div className="text-2xl font-semibold">{stats.draft}</div>
      </Card>
    </div>
  );
}

export default function EmployeeContractsPage() {
  return (
    <div>
      <ContractStats />
      <HrCrudPage
      title="Employee Contracts"
      description="Manage employee contracts and renewals"
      apiEndpoint="/api/contracts/employee-contracts"
      itemKey="employeeContracts"
      searchPlaceholder="Search contracts..."
      createLabel="Add Employee Contract"
      sortable
      perPageOptions={[10, 25, 50, 100]}
      statusTabs={{
        tabs: [
          { value: 'all', label: 'All' },
          { value: 'Draft', label: 'Draft' },
          { value: 'Pending Approval', label: 'Pending Approval' },
          { value: 'Active', label: 'Active' },
          { value: 'Expired', label: 'Expired' },
          { value: 'Terminated', label: 'Terminated' },
          { value: 'Renewed', label: 'Renewed' },
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
          name: 'employee_id',
          label: 'Employee',
          placeholder: 'All Employees',
          optionsEndpoint: '/api/users',
          optionsKey: 'users',
        },
      ]}
      columns={[
        { key: 'contract_number', label: 'Contract No.', sortable: true },
        { key: 'employee_id.name', label: 'Employee' },
        { key: 'contract_type_id.name', label: 'Contract Type' },
        { key: 'start_date', label: 'Start Date', sortable: true },
        { key: 'end_date', label: 'End Date', sortable: true },
        { key: 'basic_salary', label: 'Basic Salary', sortable: true },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created At', sortable: true },
      ]}
      fields={[
        {
          name: 'employee_id',
          label: 'Employee',
          type: 'select',
          required: true,
          placeholder: 'Select employee',
          optionsEndpoint: '/api/users',
          optionsKey: 'users',
        },
        {
          name: 'contract_type_id',
          label: 'Contract Type',
          type: 'select',
          required: true,
          placeholder: 'Select contract type',
          optionsEndpoint: '/api/contracts/types',
          optionsKey: 'contractTypes',
        },
        { name: 'start_date', label: 'Start Date', type: 'date', required: true },
        { name: 'end_date', label: 'End Date', type: 'date' },
        { name: 'basic_salary', label: 'Basic Salary', type: 'number', required: true, placeholder: '0' },
        { name: 'terms_conditions', label: 'Terms & Conditions', type: 'textarea', placeholder: 'Enter terms...' },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          placeholder: 'Select status',
          options: STATUS_OPTIONS,
        },
      ]}
      viewConfig={{
        title: 'Employee Contract Details',
        fields: [
          { key: 'contract_number', label: 'Contract No.' },
          { key: 'employee_id.name', label: 'Employee' },
          { key: 'contract_type_id.name', label: 'Contract Type' },
          { key: 'start_date', label: 'Start Date', type: 'date' },
          { key: 'end_date', label: 'End Date', type: 'date' },
          { key: 'basic_salary', label: 'Basic Salary' },
          { key: 'terms_conditions', label: 'Terms & Conditions' },
          { key: 'status', label: 'Status', type: 'badge' },
          { key: 'createdAt', label: 'Created At', type: 'date' },
        ],
      }}
    />
    </div>
  );
}