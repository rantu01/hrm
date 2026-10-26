'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  StatCard,
  StatusBadge,
  SectionCard,
  ErrorBanner,
  TableEmptyRow,
  TableLoadingRow,
} from '@/components/recruitment/recruitment-ui';
import {
  CANDIDATE_STATUSES,
  formatDate,
  formatTime,
  initialsOf,
} from '@/lib/recruitment';
import {
  Briefcase,
  Users,
  CalendarDays,
  CheckCircle2,
  FileText,
  UserPlus,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

const PIPELINE_COLORS = {
  New: 'bg-brand-white',
  Screening: 'bg-brand-yellow',
  Interview: 'bg-brand-yellow',
  Offer: 'bg-brand-yellow',
  Hired: 'bg-brand-yellow',
  Rejected: 'bg-brand-red',
};

function PipelineBar({ byStatus, total }) {
  const max = Math.max(1, ...CANDIDATE_STATUSES.map((s) => byStatus?.[s] || 0));
  return (
    <div className="flex flex-col gap-3">
      {CANDIDATE_STATUSES.map((status) => {
        const count = byStatus?.[status] || 0;
        return (
          <div key={status} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm text-muted-foreground">{status}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${PIPELINE_COLORS[status] || 'bg-brand-yellow'}`}
                style={{ width: `${Math.round((count / max) * 100)}%` }}
                role="progressbar"
                aria-valuenow={count}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-label={`${status}: ${count}`}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-sm font-medium">{count}</span>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">Total candidates: {total ?? 0}</p>
    </div>
  );
}

export default function RecruitmentOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/recruitment/stats', { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to load recruitment statistics');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const jobs = data?.jobPostings;
  const candidates = data?.candidates;
  const interviews = data?.interviews;
  const offers = data?.offers;
  const onboarding = data?.onboarding;

  return (
    <PageTemplate
      title="Recruitment"
      description="Hiring overview: openings, applicants, interviews and offers"
      actions={[
        {
          label: 'Refresh',
          variant: 'outline',
          icon: <RefreshCw className="mr-1 h-4 w-4" />,
          onClick: load,
        },
        {
          label: 'Post a Job',
          variant: 'default',
          icon: <UserPlus className="mr-1 h-4 w-4" />,
          onClick: () => router.push('/recruitment/job-postings/new'),
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Job Postings"
            value={jobs?.total ?? '—'}
            icon={Briefcase}
            accent="blue"
            hint={`${jobs?.published ?? 0} published`}
            href="/recruitment/job-postings"
          />
          <StatCard
            label="Candidates"
            value={candidates?.total ?? '—'}
            icon={Users}
            accent="violet"
            hint={`${candidates?.byStatus?.New ?? 0} new`}
            href="/recruitment/candidates"
          />
          <StatCard
            label="Interviews"
            value={interviews?.total ?? '—'}
            icon={CalendarDays}
            accent="amber"
            hint={`${interviews?.upcoming ?? 0} upcoming`}
            href="/recruitment/interviews"
          />
          <StatCard
            label="Offers"
            value={offers?.total ?? '—'}
            icon={FileText}
            accent="teal"
            hint={`${offers?.accepted ?? 0} accepted`}
            href="/recruitment/offers"
          />
          <StatCard
            label="Hired"
            value={candidates?.hired ?? '—'}
            icon={CheckCircle2}
            accent="emerald"
            hint={`${candidates?.converted ?? 0} converted to employees`}
            href="/recruitment/candidates"
          />
          <StatCard
            label="Onboarding"
            value={onboarding?.total ?? '—'}
            icon={UserPlus}
            accent="orange"
            hint={`${onboarding?.byStatus?.Completed ?? 0} completed`}
            href="/recruitment/candidate-onboarding"
          />
        </div>

        {error ? (
          <div className="flex items-center gap-3">
            <ErrorBanner message={error} className="flex-1" />
            <Button variant="outline" size="sm" onClick={load}>
              Retry
            </Button>
          </div>
        ) : null}

        {loading && !data ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-lg border bg-card" />
            ))}
          </div>
        ) : null}

        {data ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Candidate Pipeline" description="Applications by current status">
                <PipelineBar byStatus={candidates?.byStatus} total={candidates?.total} />
              </SectionCard>

              <SectionCard
                title="Active Job Postings"
                description="Latest published openings and their applicant counts"
                actions={
                  <Button variant="outline" size="sm" onClick={() => router.push('/recruitment/job-postings')}>
                    View all
                  </Button>
                }
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Applicants</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableLoadingRow colSpan={3} />
                    ) : (data.activeJobPostings || []).length === 0 ? (
                      <TableEmptyRow colSpan={3} label="No published job postings yet." />
                    ) : (
                      data.activeJobPostings.map((job) => (
                        <TableRow key={job._id}>
                          <TableCell>
                            <Link href={`/recruitment/job-postings/${job._id}`} className="font-medium hover:underline">
                              {job.title}
                            </Link>
                            <span className="ml-2 text-xs text-muted-foreground">{job.job_code}</span>
                          </TableCell>
                          <TableCell>{formatDate(job.application_deadline)}</TableCell>
                          <TableCell>{job.applicants}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </SectionCard>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard
                title="Upcoming Interviews"
                description="Scheduled interviews from today onwards"
                actions={
                  <Button variant="outline" size="sm" onClick={() => router.push('/recruitment/interviews')}>
                    View all
                  </Button>
                }
              >
                {(data.upcomingInterviews || []).length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">No upcoming interviews scheduled.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {data.upcomingInterviews.map((interview) => (
                      <li key={interview._id} className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {initialsOf(interview.candidateName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{interview.candidateName || 'Candidate'}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {interview.jobTitle || 'Job'} · {formatDate(interview.scheduled_date)} at{' '}
                            {formatTime(interview.scheduled_time)} · {interview.duration} min
                          </p>
                        </div>
                        <StatusBadge status={interview.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard
                title="Recent Candidates"
                description="Latest applicants"
                actions={
                  <Button variant="outline" size="sm" onClick={() => router.push('/recruitment/candidates')}>
                    View all
                  </Button>
                }
              >
                {(data.recentCandidates || []).length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">No candidates yet.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {data.recentCandidates.map((candidate) => (
                      <li key={candidate._id} className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {initialsOf(candidate.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/recruitment/candidates/${candidate._id}`}
                            className="truncate text-sm font-medium hover:underline"
                          >
                            {candidate.name || 'Candidate'}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {candidate.jobTitle || 'Job'} · {formatDate(candidate.application_date)}
                          </p>
                        </div>
                        <StatusBadge status={candidate.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Job Postings', href: '/recruitment/job-postings' },
                { label: 'Candidates', href: '/recruitment/candidates' },
                { label: 'Interviews', href: '/recruitment/interviews' },
                { label: 'Offers', href: '/recruitment/offers' },
                { label: 'Onboarding', href: '/recruitment/candidate-onboarding' },
              ].map((link) => (
                <Button key={link.href} variant="outline" size="sm" onClick={() => router.push(link.href)}>
                  {link.label}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </PageTemplate>
  );
}
