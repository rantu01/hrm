'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { JobPostingForm } from '@/components/recruitment/job-posting-form';
import { ErrorBanner, readApiError } from '@/components/recruitment/recruitment-ui';

export default function EditJobPostingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/recruitment/job-postings/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error(await readApiError(res, 'Failed to load job posting'));
        const json = await res.json();
        if (!cancelled) setJob(json.jobPosting);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <PageTemplate title="Edit Job Posting" description="Loading...">
        <p className="py-10 text-center text-sm text-muted-foreground">Loading job posting...</p>
      </PageTemplate>
    );
  }

  if (error || !job) {
    return (
      <PageTemplate
        title="Edit Job Posting"
        description="Unable to load this job posting"
        actions={[{ label: 'Back', variant: 'outline', onClick: () => router.push('/recruitment/job-postings') }]}
      >
        <ErrorBanner message={error || 'Job posting not found'} />
      </PageTemplate>
    );
  }

  return <JobPostingForm job={job} />;
}
