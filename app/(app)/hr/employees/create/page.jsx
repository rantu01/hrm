'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import EmployeeWizard, { emptyEmployeeForm } from '@/components/hr/employee-wizard';

export default function CreateEmployeePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  async function handleSubmit(payload) {
    setSubmitting(true);
    setServerError('');
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          json.message ||
          (Array.isArray(json.errors) ? json.errors.map((er) => er.msg).join(', ') : null) ||
          'Failed to create employee';
        throw new Error(msg);
      }
      const id = json.employee?._id;
      router.push(id ? `/hr/employees/${id}` : '/hr/employees');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTemplate
      title="Create Employee"
      description="Add a new employee to your organization."
      actions={[{ label: 'Back', variant: 'outline', onClick: () => router.push('/hr/employees') }]}
    >
      <EmployeeWizard
        mode="create"
        initialData={emptyEmployeeForm()}
        onSubmit={handleSubmit}
        submitting={submitting}
        serverError={serverError}
      />
    </PageTemplate>
  );
}
