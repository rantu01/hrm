'use client';

import HrCrudPage from '@/components/hr/hr-crud-page';

export default function GoalTypesPage() {
  return (
    <HrCrudPage
      title="Goal Types"
      description="Manage goal types used to categorize employee objectives"
      apiEndpoint="/api/performance/goal-types"
      itemKey="goalTypes"
      searchPlaceholder="Search goal types..."
      createLabel="Add Goal Type"
      sortable
      perPageOptions={[10, 25, 50]}
      toggleStatus
      statusTabs={{
        tabs: [
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
        countsKey: 'statusCounts',
      }}
      viewConfig={{
        title: 'Goal Type Details',
        fields: [
          { key: 'name', label: 'Goal Type Name' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'status', label: 'Status', type: 'status' },
          { key: 'createdAt', label: 'Created At', type: 'date' },
        ],
      }}
      columns={[
        { key: 'name', label: 'Name', sortable: true },
        { key: 'description', label: 'Description' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created At', sortable: true },
      ]}
      fields={[
        { name: 'name', label: 'Goal Type Name', type: 'text', required: true, placeholder: 'e.g. Personal, Professional, Team' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of the goal type' },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          placeholder: 'Select status',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
        },
      ]}
    />
  );
}
