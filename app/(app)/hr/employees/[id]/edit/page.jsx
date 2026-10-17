'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import EmployeeWizard, { employeeFromApi } from '@/components/hr/employee-wizard';

export default function EditEmployeePage({ params }) {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/employees/${id}`, { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Failed to load employee');
        if (!cancelled) setInitialData(employeeFromApi(json.employee));
      } catch (err) {
        if (!cancelled) setServerError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(payload) {
    // Password is handled via the change-password endpoint after the update
    const { password, documents, ...updatePayload } = payload;
    setSubmitting(true);
    setServerError('');
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatePayload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          json.message ||
          (Array.isArray(json.errors) ? json.errors.map((er) => er.msg).join(', ') : null) ||
          'Failed to update employee';
        throw new Error(msg);
      }
      // New document rows added during edit
      if (Array.isArray(documents) && documents.length > 0) {
        for (const d of documents) {
          await fetch(`/api/employees/${id}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(d),
          });
        }
      }
      if (password) {
        const pwRes = await fetch(`/api/employees/${id}/change-password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ password, password_confirmation: password }),
        });
        const pwJson = await pwRes.json().catch(() => ({}));
        if (!pwRes.ok) {
          throw new Error(pwJson.message || 'Employee updated, but password change failed (no linked login account?)');
        }
      }
      router.push(`/hr/employees/${id}`);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTemplate
      title="Edit Employee"
      description="Update employee information."
      actions={[{ label: 'Back', variant: 'outline', onClick: () => router.push(id ? `/hr/employees/${id}` : '/hr/employees') }]}
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading employee...</p>
      ) : initialData ? (
        <EmployeeWizard
          mode="edit"
          initialData={initialData}
          onSubmit={handleSubmit}
          submitting={submitting}
          serverError={serverError}
        />
      ) : (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError || 'Employee not found.'}
        </div>
      )}
    </PageTemplate>
  );
}
