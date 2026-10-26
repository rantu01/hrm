'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KanbanBoard, ErrorBanner, RatingStars, readApiError } from '@/components/recruitment/recruitment-ui';
import { useOptionList } from '@/components/recruitment/use-recruitment-list';
import {
  CANDIDATE_STATUSES,
  CANDIDATE_STATUS_LABELS,
  formatDate,
  fullName,
} from '@/lib/recruitment';
import { List, RefreshCw } from 'lucide-react';

const COLUMNS = CANDIDATE_STATUSES.map((status) => ({
  value: status,
  label: CANDIDATE_STATUS_LABELS[status] || status,
  accent: {
    New: 'bg-brand-white',
    Screening: 'bg-brand-yellow',
    Interview: 'bg-brand-yellow',
    Offer: 'bg-brand-yellow',
    Hired: 'bg-brand-yellow',
    Rejected: 'bg-brand-red',
  }[status],
}));

export default function CandidatesKanbanPage() {
  const router = useRouter();
  const jobs = useOptionList('/api/recruitment/job-postings', 'jobPostings');

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [jobId, setJobId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [movingId, setMovingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sp = new URLSearchParams({ view: 'kanban' });
      if (appliedSearch) sp.set('search', appliedSearch);
      if (jobId) sp.set('job_id', jobId);
      const res = await fetch(`/api/recruitment/candidates?${sp.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to load candidates'));
      const json = await res.json().catch(() => ({}));
      setItems(Array.isArray(json.candidates) ? json.candidates : []);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, jobId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, refreshKey]);

  async function handleMove(candidate, status) {
    if (!candidate?._id || candidate.status === status) return;
    setMovingId(candidate._id);
    setError('');
    try {
      const res = await fetch(`/api/recruitment/candidates/${candidate._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to update candidate status'));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setMovingId(null);
    }
  }

  function renderCard(candidate) {
    return (
      <div className="flex flex-col gap-1.5">
        <Link
          href={`/recruitment/candidates/${candidate._id}`}
          className="text-sm font-semibold hover:underline"
        >
          {fullName(candidate)}
        </Link>
        <p className="text-xs text-muted-foreground">{candidate.job_id?.title || 'No job posting'}</p>
        <p className="text-xs text-muted-foreground">{candidate.source_id?.name || 'No source'}</p>
        <RatingStars value={candidate.rating} />
        <p className="text-xs text-muted-foreground">Applied {formatDate(candidate.application_date)}</p>
        <p className="truncate text-xs text-muted-foreground">{candidate.email || '—'}</p>
      </div>
    );
  }

  return (
    <PageTemplate
      title="Candidates Kanban"
      description="Drag candidates between stages to move them through the hiring pipeline"
      actions={[
        {
          label: 'List View',
          variant: 'outline',
          icon: <List className="mr-1 h-4 w-4" />,
          onClick: () => router.push('/recruitment/candidates'),
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
            aria-label="Search candidates"
          />
          <Select value={jobId || 'all'} onValueChange={(v) => setJobId(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[220px]" aria-label="Filter by job posting">
              <SelectValue placeholder="All Jobs" />
            </SelectTrigger>
            <SelectContent searchable>
              <SelectItem value="all">All Jobs</SelectItem>
              {jobs.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.raw?.job_code ? `${option.raw.job_code} - ${option.label}` : option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {error ? <ErrorBanner message={error} /> : null}

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading pipeline...</p>
        ) : (
          <KanbanBoard
            columns={COLUMNS}
            items={items}
            getColumn={(candidate) => candidate.status}
            renderCard={renderCard}
            onMove={handleMove}
            movingId={movingId}
            emptyLabel="No candidates in this stage"
          />
        )}
      </div>
    </PageTemplate>
  );
}
