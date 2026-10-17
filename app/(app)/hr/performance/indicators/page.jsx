'use client';

import HrCrudPage from '@/components/hr/hr-crud-page';

export default function PerformanceIndicatorsPage() {
  return (
    <HrCrudPage
      title="Performance Indicators"
      description="Manage performance indicators used in employee evaluations"
      apiEndpoint="/api/performance/indicators"
      itemKey="indicators"
      searchPlaceholder="Search indicators..."
      createLabel="Add Indicator"
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
          name: 'category_id',
          label: 'Category',
          placeholder: 'All Categories',
          optionsEndpoint: '/api/performance/indicator-categories',
          optionsKey: 'indicatorCategories',
          optionLabel: 'name',
          optionValue: '_id',
        },
      ]}
      viewConfig={{
        title: 'Indicator Details',
        fields: [
          { key: 'name', label: 'Indicator Name' },
          { key: 'category_id.name', label: 'Category' },
          { key: 'measurement_unit', label: 'Measurement Unit' },
          { key: 'target_value', label: 'Target Value' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'status', label: 'Status', type: 'status' },
          { key: 'createdAt', label: 'Created At', type: 'date' },
        ],
      }}
      columns={[
        {
          key: 'name',
          label: 'Name',
          sortable: true,
          render: (value, row) => (
            <div>
              <div className="font-medium">{value || '—'}</div>
              {row?.category_id?.name ? (
                <span className="mt-1 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                  {row.category_id.name}
                </span>
              ) : null}
            </div>
          ),
        },
        { key: 'measurement_unit', label: 'Measurement Unit' },
        { key: 'target_value', label: 'Target Value' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created At', sortable: true },
      ]}
      fields={[
        { name: 'name', label: 'Indicator Name', type: 'text', required: true, placeholder: 'e.g. Communication Skills' },
        {
          name: 'category_id',
          label: 'Category',
          type: 'select',
          required: true,
          placeholder: 'Select Category',
          optionsEndpoint: '/api/performance/indicator-categories',
          optionsKey: 'indicatorCategories',
          optionLabel: 'name',
          optionValue: '_id',
        },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'e.g. Measures the ability to communicate effectively...' },
        { name: 'measurement_unit', label: 'Measurement Unit', type: 'text', placeholder: 'e.g. Rating 1-5, Percentage, etc.' },
        { name: 'target_value', label: 'Target Value', type: 'text', placeholder: 'e.g. 4, 95%, etc.' },
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
