'use client';

import { MasterDataPage } from '@/components/recruitment/master-data-page';
import { StatusBadge } from '@/components/recruitment/recruitment-ui';

export default function MeetingTypesPage() {
  return (
    <MasterDataPage
      title="Meeting Types"
      description="Define categories for organizing meetings."
      endpoint="/api/meetings/types"
      entityKey="meetingTypes"
      itemKey="meetingType"
      createLabel="Add Meeting Type"
      searchPlaceholder="Search meeting types..."
      columns={[
        {
          key: 'name',
          label: 'Name',
          sortable: true,
          render: (item) => (
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: item.color || '#3B82F6' }} />
              <span className="font-medium">{item.name}</span>
            </div>
          ),
        },
        {
          key: 'description',
          label: 'Description',
          render: (item) => <span className="line-clamp-2 max-w-md text-muted-foreground">{item.description || '—'}</span>,
        },
        { key: 'default_duration', label: 'Duration', render: (item) => `${item.default_duration || 0} min` },
        { key: 'status', label: 'Status', sortable: true, render: (item) => <StatusBadge status={item.status} /> },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true, placeholder: 'e.g., Client Call, Team Sync' },
        { name: 'color', label: 'Color', type: 'color', required: true },
        { name: 'default_duration', label: 'Default Duration (minutes)', type: 'number', required: true, min: 15, max: 480 },
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
      defaultForm={{ name: '', description: '', color: '#3B82F6', default_duration: 60, status: 'active' }}
    />
  );
}
