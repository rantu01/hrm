'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  StatCard,
  FilterSelect,
  Pagination,
  StatusBadge,
  TableEmptyRow,
  TableLoadingRow,
  ErrorBanner,
  SuccessBanner,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import { useRecruitmentList, useOptionList } from '@/components/recruitment/use-recruitment-list';
import { JOB_STATUSES, formatDate, formatSalaryRange } from '@/lib/recruitment';
import { Briefcase, CheckCircle2, FileEdit, XCircle, Users, Plus } from 'lucide-react';

export default function JobPostingsPage() {
  const router = useRouter();
  const list = useRecruitmentList('/api/recruitment/job-postings', 'jobPostings');
  const jobTypes = useOptionList('/api/recruitment/job-types', 'jobTypes', { status: 'active' });
  const locations = useOptionList('/api/recruitment/job-locations', 'jobLocations', { status: 'active' });
  const departments = useOptionList('/api/departments', 'departments', { status: 'active' });

  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const counts = list.statusCounts || {};
  const from = list.total === 0 ? 0 : (list.page - 1) * list.perPage + 1;
  const to = Math.min(list.page * list.perPage, list.total);

  async function togglePublish(job) {
    setBusyId(job._id);
    setError('');
    setSuccess('');
    try {
      const action = job.is_published ? 'unpublish' : 'publish';
      const res = await fetch(`/api/recruitment/job-postings/${job._id}/${action}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to update publishing status'));
      const json = await res.json().catch(() => ({}));
      setSuccess(json.message || 'Publishing status updated.');
      list.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(job) {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    setBusyId(job._id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/recruitment/job-postings/${job._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete job posting'));
      setSuccess('Job posting deleted successfully.');
      list.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PageTemplate
      title="Job Postings"
      description="Create openings, publish them and track the applicant pipeline"
      actions={[
        {
          label: 'Post a Job',
          variant: 'default',
          icon: <Plus className="mr-1 h-4 w-4" />,
          onClick: () => router.push('/recruitment/job-postings/new'),
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Jobs" value={counts.all ?? 0} icon={Briefcase} accent="blue" />
          <StatCard label="Published" value={counts.Published ?? 0} icon={CheckCircle2} accent="emerald" />
          <StatCard label="Draft" value={counts.Draft ?? 0} icon={FileEdit} accent="amber" />
          <StatCard label="Closed" value={counts.Closed ?? 0} icon={XCircle} accent="slate" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search title, code or skills..."
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            className="max-w-sm"
            aria-label="Search job postings"
          />
          <FilterSelect
            placeholder="All Job Types"
            ariaLabel="Filter by job type"
            value={list.filters.job_type_id}
            onValueChange={(v) => list.setFilter('job_type_id', v)}
            options={jobTypes.options}
          />
          <FilterSelect
            placeholder="All Locations"
            ariaLabel="Filter by location"
            value={list.filters.location_id}
            onValueChange={(v) => list.setFilter('location_id', v)}
            options={locations.options}
          />
          <FilterSelect
            placeholder="All Departments"
            ariaLabel="Filter by department"
            value={list.filters.department_id}
            onValueChange={(v) => list.setFilter('department_id', v)}
            options={departments.options}
          />
          <Select
            value={String(list.perPage)}
            onValueChange={(v) => {
              list.setPerPage(Number(v) || 10);
              list.setPage(1);
            }}
          >
            <SelectTrigger className="w-[130px]" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {list.perPageOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[{ value: 'all', label: 'All', count: counts.all }, ...JOB_STATUSES.map((s) => ({ value: s, label: s, count: counts[s] }))].map(
            (tab) => {
              const active = (list.filters.status || 'all') === tab.value;
              return (
                <Button
                  key={tab.value}
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => list.setFilter('status', tab.value)}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count !== null ? ` (${tab.count})` : ''}
                </Button>
              );
            }
          )}
        </div>

        {success ? <SuccessBanner message={success} /> : null}
        {error ? <ErrorBanner message={error} /> : null}
        {list.error ? <ErrorBanner message={list.error} /> : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.loading ? (
                <TableLoadingRow colSpan={8} />
              ) : list.items.length === 0 ? (
                <TableEmptyRow colSpan={8} label="No job postings yet. Post your first job." />
              ) : (
                list.items.map((job) => (
                  <TableRow key={job._id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/recruitment/job-postings/${job._id}`} className="font-medium hover:underline">
                            {job.title}
                          </Link>
                          {job.is_featured ? <Badge variant="secondary">Featured</Badge> : null}
                          {job.priority === 'High' ? <Badge variant="destructive">High</Badge> : null}
                        </div>
                        <span className="text-xs text-muted-foreground">{job.job_code}</span>
                      </div>
                    </TableCell>
                    <TableCell>{job.job_type_id?.name || '—'}</TableCell>
                    <TableCell>
                      {job.location_id?.name || '—'}
                      {job.location_id?.is_remote ? (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          Remote
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatSalaryRange(job)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{job.applicants ?? 0}</span>
                        <span className="text-xs text-muted-foreground">
                          ({job.shortlisted ?? 0} shortlisted · {job.hired ?? 0} hired)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={job.status} />
                        {job.is_published ? (
                          <span className="text-[10px] text-muted-foreground">Since {formatDate(job.publish_date)}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(job.application_deadline)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => router.push(`/recruitment/job-postings/${job._id}`)}>
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/recruitment/job-postings/${job._id}/edit`)}
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId === job._id} onClick={() => togglePublish(job)}>
                          {job.is_published ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button size="sm" variant="destructive" disabled={busyId === job._id} onClick={() => handleDelete(job)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination page={list.page} pages={list.pages} total={list.total} from={from} to={to} onPage={list.setPage} disabled={list.loading} />
      </div>
    </PageTemplate>
  );
}
