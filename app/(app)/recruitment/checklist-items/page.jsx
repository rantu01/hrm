'use client';

import { MasterDataPage } from '@/components/recruitment/master-data-page';
import { StatusBadge } from '@/components/recruitment/recruitment-ui';
import { Badge } from '@/components/ui/badge';
import { CHECKLIST_CATEGORIES, formatDate } from '@/lib/recruitment';

export default function ChecklistItemsPage() {
  return (
    <MasterDataPage
      title="Checklist Items"
      description="Individual onboarding tasks that belong to a checklist"
      endpoint="/api/recruitment/checklist-items"
      entityKey="checklistItems"
      itemKey="checklistItem"
      createLabel="Add Task"
      searchPlaceholder="Search tasks..."
      columns={[
        {
          key: 'checklist_id',
          label: 'Checklist',
          render: (item) => <span className="font-medium">{item.checklist_id?.name || '—'}</span>,
        },
        { key: 'task_name', label: 'Task', sortable: true },
        {
          key: 'category',
          label: 'Category',
          sortable: true,
          render: (item) => <Badge variant="outline">{item.category || 'Other'}</Badge>,
        },
        { key: 'assigned_to_role', label: 'Owner', render: (item) => item.assigned_to_role || '—' },
        { key: 'due_day', label: 'Due Day', sortable: true, render: (item) => `Day ${item.due_day}` },
        {
          key: 'is_required',
          label: 'Required',
          render: (item) =>
            item.is_required ? <Badge variant="secondary">Required</Badge> : <Badge variant="outline">Optional</Badge>,
        },
        { key: 'status', label: 'Status', render: (item) => <StatusBadge status={item.status} /> },
        { key: 'createdAt', label: 'Created', render: (item) => formatDate(item.createdAt) },
      ]}
      fields={[
        {
          name: 'checklist_id',
          label: 'Checklist',
          type: 'select',
          required: true,
          optionsEndpoint: '/api/recruitment/onboarding-checklists',
          optionsKey: 'onboardingChecklists',
          placeholder: 'Select a checklist',
          className: 'sm:col-span-2',
        },
        { name: 'task_name', label: 'Task Name', required: true, placeholder: 'e.g. Sign employment contract' },
        {
          name: 'category',
          label: 'Category',
          type: 'select',
          options: CHECKLIST_CATEGORIES.map((c) => ({ value: c, label: c })),
        },
        { name: 'assigned_to_role', label: 'Assigned To (role)', placeholder: 'e.g. HR, IT' },
        { name: 'due_day', label: 'Due Day', type: 'number', min: 1 },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
        },
        { name: 'is_required', label: 'Required task', type: 'checkbox' },
        { name: 'description', label: 'Description', type: 'textarea', className: 'sm:col-span-2', rows: 3 },
      ]}
      defaultForm={{
        checklist_id: '',
        task_name: '',
        category: 'Other',
        assigned_to_role: '',
        due_day: 1,
        is_required: true,
        description: '',
        status: 'active',
      }}
      extraFilters={[
        {
          name: 'checklist_id',
          placeholder: 'All Checklists',
          optionsEndpoint: '/api/recruitment/onboarding-checklists',
          optionsKey: 'onboardingChecklists',
          className: 'w-[240px]',
        },
      ]}
    />
  );
}
