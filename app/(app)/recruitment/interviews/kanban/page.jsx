'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  KanbanBoard,
  ErrorBanner,
  StatusBadge,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import { useOptionList } from '@/components/recruitment/use-recruitment-list';
import {
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_LABELS,
  formatDate,
  formatTime,
  fullName,
  parseList,
} from '@/lib/recruitment';
import { CalendarDays, Clock, List, RefreshCw, Users } from 'lucide-react';

const COLUMN_ACCENTS = {
  Scheduled: 'bg-brand-yellow',
  Completed: 'bg-brand-yellow',
  Cancelled: 'bg-brand-red',
  'No-show': 'bg-brand-white',
};

export default function InterviewsKanbanPage() {
  const router = useRouter();
  const users = useOptionList('/api/recruitment/users', 'users');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [movingId, setMovingId] = useState(null);

  const columns = useMemo(
    () =>
      INTERVIEW_STATUSES.map((status) => ({
        value: status,
        label: INTERVIEW_STATUS_LABELS[status] || status,
        accent: COLUMN_ACCENTS[status],
      })),
    []
  );

  const userMap = useMemo(() => {
    const map = new Map();
    for (const user of users.items) map.set(String(user._id), user);
    return map;
  }, [users.items]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sp = new URLSearchParams({ view: 'kanban' });
      if (search) sp.set('search', search);
      const res = await fetch(`/api/recruitment/interviews?${sp.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to load interviews'));
      const json = await res.json().catch(() => ({}));
      setItems(Array.isArray(json.interviews) ? json.interviews : []);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, refreshKey]);

  async function handleMove(interview, nextStatus) {
    if (!nextStatus || nextStatus === interview.status) return;
    setMovingId(interview._id);
    setError('');
    try {
      const res = await fetch(`/api/recruitment/interviews/${interview._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to move interview'));
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setMovingId(null);
    }
  }

  function interviewerLabel(interview) {
    const ids = parseList(interview.interviewers);
    if (ids.length === 0) return { count: 0, names: 'No interviewers' };
    const names = ids
      .map((id) => userMap.get(String(id))?.name)
      .filter(Boolean)
      .join(', ');
    return { count: ids.length, names: names || `${ids.length} interviewer${ids.length > 1 ? 's' : ''}` };
  }

  return (
    <PageTemplate
      title="Interviews Kanban"
      description="Drag cards between columns to update interview status"
      actions={[
        {
          label: 'List View',
          variant: 'outline',
          icon: <List className="mr-1 h-4 w-4" />,
          onClick: () => router.push('/recruitment/interviews'),
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
            }}
          >
            <Input
              placeholder="Search candidate name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-[280px]"
              aria-label="Search interviews"
            />
            <Button type="submit" size="sm" variant="outline">
              Search
            </Button>
            {search ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                }}
              >
                Clear
              </Button>
            ) : null}
          </form>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {error ? <ErrorBanner message={error} /> : null}
        {loading ? <p className="py-6 text-center text-sm text-muted-foreground">Loading interviews...</p> : null}

        {!loading ? (
          <KanbanBoard
            columns={columns}
            items={items}
            movingId={movingId}
            getColumn={(item) => item.status}
            onMove={handleMove}
            emptyLabel="No interviews"
            renderCard={(interview) => {
              const interviewers = interviewerLabel(interview);
              return (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/recruitment/interviews/${interview._id}`}
                        className="block truncate text-sm font-semibold hover:underline"
                      >
                        {fullName(interview.candidate_id)}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">{interview.job_id?.title || '—'}</p>
                    </div>
                    <StatusBadge status={interview.status} labels={INTERVIEW_STATUS_LABELS} />
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {interview.round_id?.name ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {interview.round_id.name}
                      </Badge>
                    ) : null}
                    {interview.interview_type_id?.name ? (
                      <Badge variant="outline" className="text-[10px]">
                        {interview.interview_type_id.name}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      {formatDate(interview.scheduled_date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {formatTime(interview.scheduled_time)} · {interview.duration ?? '—'} min
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate" title={interviewers.names}>
                        {interviewers.count > 0
                          ? `${interviewers.count} · ${interviewers.names}`
                          : interviewers.names}
                      </span>
                    </span>
                  </div>
                </div>
              );
            }}
          />
        ) : null}

        {!loading && items.length === 0 && !error ? (
          <p className="text-center text-sm text-muted-foreground">
            No interviews match this search. Schedule one from the list view.
          </p>
        ) : null}
      </div>
    </PageTemplate>
  );
}
