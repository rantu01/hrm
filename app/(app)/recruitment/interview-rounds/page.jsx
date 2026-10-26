'use client';

import { MasterDataPage } from '@/components/recruitment/master-data-page';
import { StatusBadge } from '@/components/recruitment/recruitment-ui';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/recruitment';

export default function InterviewRoundsPage() {
  return (
    <MasterDataPage
      title="Interview Rounds"
      description="Ordered interview stages for each job posting"
      endpoint="/api/recruitment/interview-rounds"
      entityKey="interviewRounds"
      itemKey="interviewRound"
      createLabel="Add Round"
      searchPlaceholder="Search rounds..."
      columns={[
        {
          key: 'job_id',
          label: 'Job Posting',
          render: (item) => (
            <div className="flex flex-col">
              <span className="font-medium">{item.job_id?.title || '—'}</span>
              {item.job_id?.job_code ? (
                <span className="text-xs text-muted-foreground">{item.job_id.job_code}</span>
              ) : null}
            </div>
          ),
        },
        { key: 'name', label: 'Round', sortable: true },
        {
          key: 'sequence_number',
          label: 'Sequence',
          sortable: true,
          render: (item) => <Badge variant="outline">#{item.sequence_number}</Badge>,
        },
        {
          key: 'description',
          label: 'Description',
          render: (item) => (
            <span className="line-clamp-2 max-w-xs text-muted-foreground">{item.description || '—'}</span>
          ),
        },
        { key: 'status', label: 'Status', sortable: true, render: (item) => <StatusBadge status={item.status} /> },
        { key: 'createdAt', label: 'Created', render: (item) => formatDate(item.createdAt) },
      ]}
      fields={[
        {
          name: 'job_id',
          label: 'Job Posting',
          type: 'select',
          required: true,
          optionsEndpoint: '/api/recruitment/job-postings',
          optionsKey: 'jobPostings',
          placeholder: 'Select a job posting',
          className: 'sm:col-span-2',
        },
        { name: 'name', label: 'Round Name', required: true, placeholder: 'e.g. Technical Round 1' },
        { name: 'sequence_number', label: 'Sequence Number', type: 'number', required: true, min: 1 },
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
      defaultForm={{ job_id: '', name: '', sequence_number: 1, description: '', status: 'active' }}
      extraFilters={[
        {
          name: 'job_id',
          placeholder: 'All Job Postings',
          optionsEndpoint: '/api/recruitment/job-postings',
          optionsKey: 'jobPostings',
          className: 'w-[240px]',
        },
      ]}
    />
  );
}
