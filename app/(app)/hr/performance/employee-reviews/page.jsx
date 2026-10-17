'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

export default function EmployeeReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [employeeId, setEmployeeId] = useState('all');
  const [reviewerId, setReviewerId] = useState('all');
  const [reviewCycleId, setReviewCycleId] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [cycles, setCycles] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '10' });
      if (debouncedSearch) qs.set('search', debouncedSearch);
      if (status && status !== 'all') qs.set('status', status);
      if (employeeId && employeeId !== 'all') qs.set('employee_id', employeeId);
      if (reviewerId && reviewerId !== 'all') qs.set('reviewer_id', reviewerId);
      if (reviewCycleId && reviewCycleId !== 'all') qs.set('review_cycle_id', reviewCycleId);
      const res = await fetch(`/api/performance/reviews?${qs.toString()}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to fetch reviews');
      setReviews(Array.isArray(json.reviews) ? json.reviews : []);
      setStatusCounts(json.statusCounts || {});
      const pagination = json.pagination || {};
      setTotal(pagination.total ?? 0);
      setTotalPages(pagination.pages || 1);
    } catch (err) {
      setError(err.message);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, employeeId, reviewerId, reviewCycleId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [empRes, cycRes] = await Promise.all([
          fetch('/api/employees?limit=100', { credentials: 'include' }),
          fetch('/api/performance/review-cycles?limit=100', { credentials: 'include' }),
        ]);
        const empJson = await empRes.json().catch(() => ({}));
        const cycJson = await cycRes.json().catch(() => ({}));
        setEmployees(Array.isArray(empJson.employees) ? empJson.employees : []);
        setCycles(Array.isArray(cycJson.reviewCycles) ? cycJson.reviewCycles : []);
      } catch {
        setEmployees([]);
        setCycles([]);
      }
    }
    loadOptions();
  }, []);

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      const res = await fetch(`/api/performance/reviews/${id}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to delete');
      fetchReviews();
    } catch (err) {
      setError(err.message);
    }
  }

  const tabs = [
    { value: 'all', label: `All (${statusCounts.all ?? total ?? 0})` },
    { value: 'pending', label: `Pending (${statusCounts.pending ?? 0})` },
    { value: 'in_progress', label: `In Progress (${statusCounts.in_progress ?? 0})` },
    { value: 'completed', label: `Completed (${statusCounts.completed ?? 0})` },
  ];

  return (
    <PageTemplate
      title="Employee Reviews"
      description="Manage performance reviews for your employees"
      actions={[{ label: 'Schedule Review', variant: 'default', onClick: () => router.push('/hr/performance/employee-reviews/create') }]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search reviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={employeeId} onValueChange={(v) => { setEmployeeId(v); setPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e._id || e.id} value={String(e._id || e.id)}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={reviewerId} onValueChange={(v) => { setReviewerId(v); setPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Reviewers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reviewers</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e._id || e.id} value={String(e._id || e.id)}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={reviewCycleId} onValueChange={(v) => { setReviewCycleId(v); setPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Review Cycles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Review Cycles</SelectItem>
              {cycles.map((c) => (
                <SelectItem key={c._id || c.id} value={String(c._id || c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <Button
              key={t.value}
              size="sm"
              variant={status === t.value ? 'default' : 'outline'}
              onClick={() => { setStatus(t.value); setPage(1); }}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Review Cycle</TableHead>
              <TableHead>Review Date</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">No reviews found.</TableCell>
              </TableRow>
            ) : (
              reviews.map((r) => (
                <TableRow key={r._id || r.id}>
                  <TableCell>
                    <div className="font-medium">{r.employee_id?.name || '—'}</div>
                    <div className="text-sm text-muted-foreground">{r.employee_id?.email || ''}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.reviewer_id?.name || '—'}</div>
                    <div className="text-sm text-muted-foreground">{r.reviewer_id?.email || ''}</div>
                  </TableCell>
                  <TableCell>{r.review_cycle_id?.name || '—'}</TableCell>
                  <TableCell>{formatDate(r.review_date)}</TableCell>
                  <TableCell>{r.overall_rating ? Number(r.overall_rating).toFixed(1) : '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{String(r.status || '—')}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/hr/performance/employee-reviews/${r._id || r.id}`}>
                        <Button size="sm" variant="outline">View</Button>
                      </Link>
                      {r.status !== 'completed' && (
                        <Link href={`/hr/performance/employee-reviews/${r._id || r.id}/conduct`}>
                          <Button size="sm" variant="secondary">Conduct</Button>
                        </Link>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(r._id || r.id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {reviews.length} of {total}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
