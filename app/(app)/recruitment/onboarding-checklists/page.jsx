'use client';

import { MasterDataPage } from '@/components/recruitment/master-data-page';
import { StatusBadge } from '@/components/recruitment/recruitment-ui';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/recruitment';

export default function OnboardingChecklistsPage() {
  return (
    <MasterDataPage
      title="Onboarding Checklists"
      description="Reusable task templates for new employee onboarding"
      endpoint="/api/recruitment/onboarding-checklists"
      entityKey="onboardingChecklists"
      itemKey="onboardingChecklist"
      createLabel="Add Checklist"
      searchPlaceholder="Search checklists..."
      columns={[
        {
          key: 'name',
          label: 'Checklist',
          sortable: true,
          render: (item) => (
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.name}</span>
              {item.is_default ? <Badge variant="secondary">Default</Badge> : null}
            </div>
          ),
        },
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
        { name: 'name', label: 'Name', required: true, placeholder: 'e.g. Standard Onboarding' },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
        },
        { name: 'is_default', label: 'Use as default checklist', type: 'checkbox', className: 'sm:col-span-2' },
        { name: 'description', label: 'Description', type: 'textarea', className: 'sm:col-span-2', rows: 3 },
      ]}
      defaultForm={{ name: '', description: '', is_default: false, status: 'active' }}
    />
  );
}
