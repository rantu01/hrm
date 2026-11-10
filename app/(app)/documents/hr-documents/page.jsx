'use client';

import HrCrudPage from '@/components/hr/hr-crud-page';

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Under Review', label: 'Under Review' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Published', label: 'Published' },
  { value: 'Archived', label: 'Archived' },
  { value: 'Expired', label: 'Expired' },
];

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

export default function HrDocumentsPage() {
  return (
    <HrCrudPage
      title="HR Documents"
      description="Store and manage official HR documents"
      apiEndpoint="/api/documents/hr-documents"
      itemKey="hrDocuments"
      searchPlaceholder="Search documents..."
      createLabel="Upload Document"
      sortable
      perPageOptions={[9, 18, 27]}
      statusTabs={{
        countsKey: 'statusCounts',
        tabs: [
          { value: 'all', label: 'All' },
          { value: 'Draft', label: 'Draft' },
          { value: 'Under Review', label: 'Under Review' },
          { value: 'Approved', label: 'Approved' },
          { value: 'Published', label: 'Published' },
          { value: 'Archived', label: 'Archived' },
          { value: 'Expired', label: 'Expired' },
        ],
      }}
      filters={[
        {
          name: 'category_id',
          label: 'Category',
          placeholder: 'All Categories',
          optionsEndpoint: '/api/documents/categories',
          optionsKey: 'documentCategories',
        },
      ]}
      columns={[
        { key: 'title', label: 'Title', sortable: true },
        { key: 'category_id.name', label: 'Category' },
        { key: 'status', label: 'Status' },
        { key: 'file_name', label: 'File' },
        { key: 'effective_date', label: 'Effective', sortable: true },
        { key: 'expiry_date', label: 'Expires', sortable: true },
        { key: 'download_count', label: 'Downloads' },
        { key: 'createdAt', label: 'Created At', sortable: true },
      ]}
      fields={[
        { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Document title' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Enter description...' },
        {
          name: 'category_id',
          label: 'Category',
          type: 'select',
          required: true,
          placeholder: 'Select category',
          optionsEndpoint: '/api/documents/categories',
          optionsKey: 'documentCategories',
        },
        { name: 'file', label: 'File URL (from Media Library)', type: 'text', required: true, placeholder: 'https://res.cloudinary.com/dyhhdl1hy/...' },
        { name: 'effective_date', label: 'Effective Date', type: 'date' },
        { name: 'expiry_date', label: 'Expiry Date', type: 'date' },
        {
          name: 'requires_acknowledgment',
          label: 'Requires Acknowledgment',
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
      rowActions={[
        {
          label: 'Download',
          variant: 'outline',
          onClick: (item) => {
            const id = item._id || item.id;
            window.open(`/api/documents/hr-documents/${id}/download`, '_blank');
          },
        },
      ]}
      viewConfig={{
        title: 'HR Document Details',
        fields: [
          { key: 'title', label: 'Title' },
          { key: 'description', label: 'Description' },
          { key: 'category_id.name', label: 'Category' },
          { key: 'file_name', label: 'File Name' },
          { key: 'status', label: 'Status', type: 'badge' },
          { key: 'effective_date', label: 'Effective Date', type: 'date' },
          { key: 'expiry_date', label: 'Expiry Date', type: 'date' },
          { key: 'requires_acknowledgment', label: 'Requires Acknowledgment' },
          { key: 'download_count', label: 'Downloads' },
          { key: 'createdAt', label: 'Created At', type: 'date' },
        ],
      }}
    />
  );
}