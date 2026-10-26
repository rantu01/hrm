'use client';

import { MasterDataPage } from '@/components/recruitment/master-data-page';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/recruitment';

export default function CustomQuestionsPage() {
  return (
    <MasterDataPage
      title="Custom Questions"
      description="Extra questions attached to job application forms"
      endpoint="/api/recruitment/custom-questions"
      entityKey="customQuestions"
      itemKey="customQuestion"
      createLabel="Add Question"
      searchPlaceholder="Search questions..."
      hasStatus={false}
      canToggle={false}
      columns={[
        {
          key: 'question',
          label: 'Question',
          render: (item) => <span className="block max-w-2xl">{item.question}</span>,
        },
        {
          key: 'required',
          label: 'Mandatory',
          render: (item) =>
            item.required ? <Badge variant="secondary">Required</Badge> : <Badge variant="outline">Optional</Badge>,
        },
        { key: 'createdAt', label: 'Created', render: (item) => formatDate(item.createdAt) },
      ]}
      fields={[
        {
          name: 'question',
          label: 'Question',
          type: 'textarea',
          required: true,
          rows: 3,
          className: 'sm:col-span-2',
          placeholder: 'e.g. Why do you want to join our team?',
        },
        { name: 'required', label: 'Mandatory question', type: 'checkbox', className: 'sm:col-span-2' },
      ]}
      defaultForm={{ question: '', required: false }}
    />
  );
}
