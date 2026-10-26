'use client';

import { MasterDataPage } from '@/components/recruitment/master-data-page';
import { StatusBadge } from '@/components/recruitment/recruitment-ui';
import { formatDate } from '@/lib/recruitment';

export default function CandidateSourcesPage() {
  return (
    <MasterDataPage
      title="Candidate Sources"
      description="Where candidates come from (job boards, referrals, ...)"
      endpoint="/api/recruitment/candidate-sources"
      entityKey="candidateSources"
      itemKey="candidateSource"
      createLabel="Add Source"
      searchPlaceholder="Search sources..."
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
        { name: 'name', label: 'Name', required: true, placeholder: 'e.g. LinkedIn' },
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
