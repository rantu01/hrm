'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  StatCard,
  StatusBadge,
  SectionCard,
  DetailItem,
  SkillsTags,
  ErrorBanner,
  SuccessBanner,
  TableEmptyRow,
  TableLoadingRow,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import {
  formatDate,
  formatMoney,
  formatSalaryRange,
  fullName,
  parseList,
} from '@/lib/recruitment';
import { Users, UserCheck, Briefcase, CalendarClock, ArrowLeft, Pencil } from 'lucide-react';

export default function JobPostingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [data, setData] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [jobRes, candRes] = await Promise.all([
        fetch(`/api/recruitment/job-postings/${id}`, { credentials: 'include' }),
        fetch(`/api/recruitment/candidates?job_id=${id}&limit=10&sort_field=created_at&sort_direction=desc`, {
          credentials: 'include',
        }),
      ]);
      if (!jobRes.ok) throw new Error(await readApiError(jobRes, 'Failed to load job posting'));
      const jobJson = await jobRes.json();
      setData(jobJson);
      if (candRes.ok) {
        const candJson = await candRes.json().catch(() => ({}));
        setCandidates(Array.isArray(candJson.candidates) ? candJson.candidates : []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function togglePublish() {
    if (!data?.jobPosting) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const job = data.jobPosting;
      const action = job.is_published ? 'unpublish' : 'publish';
      const res = await fetch(`/api/recruitment/job-postings/${job._id}/${action}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to update publishing status'));
      const json = await res.json().catch(() => ({}));
      setSuccess(json.message || 'Publishing status updated.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <PageTemplate title="Job Posting" description="Loading...">
        <p className="py-10 text-center text-sm text-muted-foreground">Loading job posting...</p>
      </PageTemplate>
    );
  }

  if (error || !data?.jobPosting) {
    return (
      <PageTemplate
        title="Job Posting"
        description="Unable to load this job posting"
        actions={[{ label: 'Back', variant: 'outline', onClick: () => router.push('/recruitment/job-postings') }]}
      >
        <ErrorBanner message={error || 'Job posting not found'} />
      </PageTemplate>
    );
  }

  const job = data.jobPosting;
  const counts = data.candidateStatusCounts || {};
  const shortlisted = (counts.Screening || 0) + (counts.Interview || 0) + (counts.Offer || 0);
  const requirements = parseList(job.requirements, 200);
  const benefits = parseList(job.benefits, 200);

  return (
    <PageTemplate
      title={job.title}
      description={`${job.job_code} · ${job.status}`}
      actions={[
        {
          label: 'Back',
          variant: 'outline',
          icon: <ArrowLeft className="mr-1 h-4 w-4" />,
          onClick: () => router.push('/recruitment/job-postings'),
        },
        {
          label: 'Edit',
          variant: 'outline',
          icon: <Pencil className="mr-1 h-4 w-4" />,
          onClick: () => router.push(`/recruitment/job-postings/${job._id}/edit`),
        },
        {
          label: job.is_published ? 'Unpublish' : 'Publish',
          variant: 'default',
          disabled: busy,
          onClick: togglePublish,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        {success ? <SuccessBanner message={success} /> : null}
        {error ? <ErrorBanner message={error} /> : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Applicants" value={counts.all ?? 0} icon={Users} accent="blue" />
          <StatCard label="In Pipeline" value={shortlisted} icon={UserCheck} accent="amber" />
          <StatCard label="Hired" value={counts.Hired ?? 0} icon={UserCheck} accent="emerald" />
          <StatCard label="Open Positions" value={job.positions ?? 1} icon={Briefcase} accent="violet" />
        </div>

        <SectionCard
          title="Overview"
          actions={
            <div className="flex items-center gap-2">
              <StatusBadge status={job.status} />
              {job.is_featured ? <Badge variant="secondary">Featured</Badge> : null}
              {job.is_published ? <Badge variant="success">Live</Badge> : null}
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Job Type">{job.job_type_id?.name}</DetailItem>
            <DetailItem label="Location">
              {job.location_id?.name}
              {job.location_id?.is_remote ? ' (Remote)' : ''}
            </DetailItem>
            <DetailItem label="Department">{job.department_id?.name}</DetailItem>
            <DetailItem label="Branch">{job.branch_id?.name}</DetailItem>
            <DetailItem label="Category">{job.category_id?.name}</DetailItem>
            <DetailItem label="Priority">
              <StatusBadge status={job.priority} />
            </DetailItem>
            <DetailItem label="Experience">
              {job.min_experience ?? 0}–{job.max_experience ?? job.min_experience ?? 0} years
            </DetailItem>
            <DetailItem label="Salary">{formatSalaryRange(job)}</DetailItem>
            <DetailItem label="Min / Max Salary">
              {formatMoney(job.min_salary)} / {formatMoney(job.max_salary)}
            </DetailItem>
            <DetailItem label="Start Date">{formatDate(job.start_date)}</DetailItem>
            <DetailItem label="Application Deadline">{formatDate(job.application_deadline)}</DetailItem>
            <DetailItem label="Published On">{formatDate(job.publish_date)}</DetailItem>
          </div>

          <div className="mt-5">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Skills</p>
            <SkillsTags skills={job.skills} max={50} />
          </div>
        </SectionCard>

        <SectionCard title="Job Description">
          <div className="flex flex-col gap-5 text-sm">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap">{job.description || '—'}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Requirements</p>
              <p className="whitespace-pre-wrap">{job.requirements || '—'}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Benefits</p>
              <p className="whitespace-pre-wrap">{job.benefits || '—'}</p>
            </div>
          </div>
        </SectionCard>

        {Array.isArray(job.custom_question) && job.custom_question.length > 0 ? (
          <SectionCard title="Custom Application Questions">
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              {job.custom_question.map((question) => (
                <li key={question._id || question}>
                  {question.question || question}
                  {question.required ? <span className="ml-1 text-xs text-muted-foreground">(required)</span> : null}
                </li>
              ))}
            </ol>
          </SectionCard>
        ) : null}

        <SectionCard
          title="Applicants"
          description="Candidates who applied to this opening"
          actions={
            <Button size="sm" variant="outline" onClick={() => router.push(`/recruitment/candidates?job_id=${job._id}`)}>
              View all applicants
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.length === 0 ? (
                  <TableEmptyRow colSpan={5} label="No candidates have applied yet." />
                ) : (
                  candidates.map((candidate) => (
                    <TableRow key={candidate._id}>
                      <TableCell className="font-medium">{fullName(candidate)}</TableCell>
                      <TableCell>{candidate.email || '—'}</TableCell>
                      <TableCell>{formatDate(candidate.application_date)}</TableCell>
                      <TableCell>
                        <StatusBadge status={candidate.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/recruitment/candidates/${candidate._id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      </div>
    </PageTemplate>
  );
}
