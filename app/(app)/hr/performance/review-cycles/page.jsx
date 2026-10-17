'use client';

import HrCrudPage from '@/components/hr/hr-crud-page';

const FREQUENCIES = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'One-time'];

export default function ReviewCyclesPage() {
  return (
    <HrCrudPage
      title="Review Cycles"
      description="Manage performance review cycles and their schedules"
      apiEndpoint="/api/performance/review-cycles"
      itemKey="reviewCycles"
      searchPlaceholder="Search review cycles..."
      createLabel="Add Review Cycle"
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
      filters={[
        {
          name: 'frequency',
          label: 'Frequency',
          placeholder: 'All Frequencies',
          staticOptions: FREQUENCIES.map((f) => ({ value: f, label: f })),
        },
      ]}
      viewConfig={{
        title: 'Review Cycle Details',
        fields: [
          { key: 'name', label: 'Review Cycle Name' },
          { key: 'frequency', label: 'Frequency' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'status', label: 'Status', type: 'status' },
          { key: 'createdAt', label: 'Created At', type: 'date' },
        ],
      }}
      columns={[
        { key: 'name', label: 'Name', sortable: true },
        { key: 'frequency', label: 'Frequency' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created At', sortable: true },
      ]}
      fields={[
        { name: 'name', label: 'Review Cycle Name', type: 'text', required: true, placeholder: 'e.g. Annual Review 2026' },
        {
          name: 'frequency',
          label: 'Frequency',
          type: 'select',
          required: true,
          placeholder: 'Select frequency',
          options: FREQUENCIES.map((f) => ({ value: f, label: f })),
        },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of the review cycle' },
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
