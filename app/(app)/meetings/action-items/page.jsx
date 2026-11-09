'use client';

import { MasterDataPage } from '@/components/recruitment/master-data-page';
import { StatusBadge } from '@/components/recruitment/recruitment-ui';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Not Started', 'In Progress', 'Completed', 'Overdue'];

export default function ActionItemsPage() {
  return (
    <MasterDataPage
      title="Action Items"
      description="Track tasks and follow-ups from meetings."
      endpoint="/api/meetings/action-items"
      entityKey="actionItems"
      itemKey="actionItem"
      createLabel="Add Action Item"
      searchPlaceholder="Search action items..."
      columns={[
        { key: 'title', label: 'Title', sortable: true },
        { key: 'meeting_id', label: 'Meeting', render: (item) => item.meeting_id?.title || '—' },
        { key: 'assigned_to', label: 'Assigned To', render: (item) => item.assigned_to?.name || '—' },
        { key: 'due_date', label: 'Due Date', render: (item) => item.due_date ? new Date(item.due_date).toLocaleDateString() : '—' },
        { key: 'priority', label: 'Priority', sortable: true },
        { key: 'status', label: 'Status', sortable: true, render: (item) => <StatusBadge status={item.status} /> },
      ]}
      fields={[
        { name: 'title', label: 'Title', required: true, placeholder: 'e.g., Prepare report' },
        {
          name: 'meeting_id',
          label: 'Meeting',
          type: 'select',
          required: true,
          optionsEndpoint: '/api/meetings',
          optionsKey: 'meetings',
        },
        {
          name: 'assigned_to',
          label: 'Assigned To',
          type: 'select',
          required: true,
          optionsEndpoint: '/api/users',
          optionsKey: 'users',
        },
        { name: 'due_date', label: 'Due Date', type: 'date', required: true },
        {
          name: 'priority',
          label: 'Priority',
          type: 'select',
          options: PRIORITIES.map((p) => ({ value: p, label: p })),
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: STATUSES.map((s) => ({ value: s, label: s })),
        },
        { name: 'progress_percentage', label: 'Progress (%)', type: 'number', min: 0, max: 100 },
        { name: 'notes', label: 'Notes', type: 'textarea', className: 'sm:col-span-2', rows: 2 },
        { name: 'description', label: 'Description', type: 'textarea', className: 'sm:col-span-2', rows: 3 },
      ]}
      defaultForm={{
        title: '',
        description: '',
        meeting_id: '',
        assigned_to: '',
        due_date: '',
        priority: 'Medium',
        status: 'Not Started',
        progress_percentage: 0,
        notes: '',
      }}
      canToggle={false}
    />
  );
}
