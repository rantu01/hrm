'use client';

import { MasterDataPage } from '@/components/recruitment/master-data-page';
import { StatusBadge } from '@/components/recruitment/recruitment-ui';
import { formatDate } from '@/lib/recruitment';

export default function JobCategoriesPage() {
  return (
    <MasterDataPage
      title="Job Categories"
      description="Group job postings into functional categories"
      endpoint="/api/recruitment/job-categories"
      entityKey="jobCategories"
      itemKey="jobCategory"
      createLabel="Add Category"
      searchPlaceholder="Search categories..."
      columns={[
        { key: 'name', label: 'Name', sortable: true },
        {
          key: 'description',
          label: 'Description',
          render: (item) => (
            <span className="line-clamp-2 max-w-md text-muted-foreground">{item.description || '—'}</span>
          ),
        },
        { key: 'status', label: 'Status', sortable: true, render: (item) => <StatusBadge status={item.status} /> },
        { key: 'createdAt', label: 'Created', render: (item) => formatDate(item.createdAt) },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true, placeholder: 'e.g. Engineering' },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
        },
        { name: 'description', label: 'Description', type: 'textarea', className: 'sm:col-span-2', rows: 3 },
      ]}
      defaultForm={{ name: '', description: '', status: 'active' }}
    />
  );
}
