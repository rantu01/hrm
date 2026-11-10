'use client';

import HrCrudPage from '@/components/hr/hr-crud-page';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function DocumentCategoriesPage() {
  return (
    <HrCrudPage
      title="Document Categories"
      description="Manage document categories"
      apiEndpoint="/api/documents/categories"
      itemKey="documentCategories"
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
      }}
      columns={[
        { key: 'name', label: 'Name', sortable: true },
        { key: 'description', label: 'Description' },
        { key: 'color', label: 'Color' },
        { key: 'icon', label: 'Icon' },
        { key: 'sort_order', label: 'Sort Order', sortable: true },
        { key: 'is_mandatory', label: 'Mandatory' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created At', sortable: true },
      ]}
      fields={[
        { name: 'name', label: 'Category Name', type: 'text', required: true, placeholder: 'e.g. Policies, Contracts' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Enter description...' },
        { name: 'color', label: 'Color (hex)', type: 'text', placeholder: '#3b82f6' },
        { name: 'icon', label: 'Icon', type: 'text', placeholder: 'FileText' },
        { name: 'sort_order', label: 'Sort Order', type: 'number', placeholder: '0' },
        {
          name: 'is_mandatory',
          label: 'Mandatory',
          type: 'select',
          placeholder: 'Select',
          options: [
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ],
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
        title: 'Document Category Details',
        fields: [
          { key: 'name', label: 'Name' },
          { key: 'description', label: 'Description' },
          { key: 'color', label: 'Color' },
          { key: 'icon', label: 'Icon' },
          { key: 'sort_order', label: 'Sort Order' },
          { key: 'is_mandatory', label: 'Mandatory' },
          { key: 'status', label: 'Status', type: 'badge' },
          { key: 'createdAt', label: 'Created At', type: 'date' },
        ],
      }}
    />
  );
}