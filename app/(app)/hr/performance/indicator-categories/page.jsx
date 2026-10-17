'use client';

import HrCrudPage from '@/components/hr/hr-crud-page';

export default function IndicatorCategoriesPage() {
  return (
    <HrCrudPage
      title="Indicator Categories"
      description="Manage categories used to group performance indicators"
      apiEndpoint="/api/performance/indicator-categories"
      itemKey="indicatorCategories"
      searchPlaceholder="Search categories..."
      createLabel="Add Category"
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
        title: 'Indicator Category Details',
        fields: [
          { key: 'name', label: 'Category Name' },
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
        { name: 'name', label: 'Category Name', type: 'text', required: true, placeholder: 'e.g. Communication Skills' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'e.g. Indicators related to communication and interpersonal skills...' },
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
