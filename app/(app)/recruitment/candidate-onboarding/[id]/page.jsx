'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  StatCard,
  StatusBadge,
  SectionCard,
  DetailItem,
  ErrorBanner,
  SuccessBanner,
  TableEmptyRow,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import {
  ONBOARDING_STATUSES,
  ONBOARDING_STATUS_LABELS,
  formatDate,
} from '@/lib/recruitment';
import { ArrowLeft, CalendarDays, ClipboardList, CheckSquare, PlayCircle, Clock, CheckCircle2 } from 'lucide-react';

const STATUS_ACCENTS = {
  Pending: 'violet',
  'In Progress': 'amber',
  Completed: 'emerald',
};

const STATUS_ICONS = {
  Pending: Clock,
  'In Progress': PlayCircle,
  Completed: CheckCircle2,
};

export default function CandidateOnboardingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!id) return;
      if (!silent) setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/recruitment/candidate-onboarding/${id}`, { credentials: 'include' });
        if (res.status === 404) {
          setData(null);
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error(await readApiError(res, 'Failed to load onboarding process'));
        const json = await res.json();
        setData({
          onboarding: json.onboarding,
          checklistItems: Array.isArray(json.checklistItems) ? json.checklistItems : [],
        });
        setNotFound(false);
      } catch (err) {
        setError(err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleStatusChange(status) {
    if (!data?.onboarding || !status || status === data.onboarding.status) return;
    setSavingStatus(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/recruitment/candidate-onboarding/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to update onboarding status'));
      const json = await res.json().catch(() => ({}));
      setSuccess(json.message || `Status changed to ${ONBOARDING_STATUS_LABELS[status] || status}.`);
      await load({ silent: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingStatus(false);
    }
  }

  if (loading) {
    return (
      <PageTemplate title="Candidate Onboarding" description="Loading...">
        <p className="py-10 text-center text-sm text-muted-foreground">Loading onboarding process...</p>
      </PageTemplate>
    );
  }

  if (notFound || !data?.onboarding) {
    return (
      <PageTemplate
        title="Candidate Onboarding"
        description="Unable to load this onboarding process"
        actions={[
          {
            label: 'Back',
            variant: 'outline',
            icon: <ArrowLeft className="mr-1 h-4 w-4" />,
            onClick: () => router.push('/recruitment/candidate-onboarding'),
          },
        ]}
      >
        <ErrorBanner message={error || 'Onboarding process not found'} />
      </PageTemplate>
    );
  }

  const onboarding = data.onboarding;
  const checklistItems = data.checklistItems || [];
  const status = onboarding.status || 'Pending';
  const requiredCount = checklistItems.filter((item) => item.is_required).length;
  const StatusIcon = STATUS_ICONS[status] || Clock;
  const employeeName = onboarding.employee_id?.name || 'Employee';
  const checklistName = onboarding.checklist_id?.name || 'Checklist';
  const taskCount = checklistItems.length;

  return (
    <PageTemplate
      title={`Onboarding — ${employeeName}`}
      description={checklistName}
      actions={[
        {
          label: 'Back',
          variant: 'outline',
          icon: <ArrowLeft className="mr-1 h-4 w-4" />,
          onClick: () => router.push('/recruitment/candidate-onboarding'),
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        {success ? <SuccessBanner message={success} /> : null}
        {error ? <ErrorBanner message={error} /> : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Status"
            value={ONBOARDING_STATUS_LABELS[status] || status}
            icon={StatusIcon}
            accent={STATUS_ACCENTS[status] || 'blue'}
          />
          <StatCard label="Start Date" value={formatDate(onboarding.start_date)} icon={CalendarDays} accent="blue" />
          <StatCard label="Tasks" value={taskCount} icon={ClipboardList} accent="violet" />
          <StatCard label="Required Tasks" value={requiredCount} icon={CheckSquare} accent="emerald" />
        </div>

        <SectionCard title="Overview" actions={<StatusBadge status={status} labels={ONBOARDING_STATUS_LABELS} />}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Employee">
              <span className="font-medium">{onboarding.employee_id?.name || '—'}</span>
              {onboarding.employee_id?.email ? (
                <span className="block text-xs text-muted-foreground">{onboarding.employee_id.email}</span>
              ) : null}
            </DetailItem>
            <DetailItem label="Checklist">{checklistName}</DetailItem>
            <DetailItem label="Start Date">{formatDate(onboarding.start_date)}</DetailItem>
            <DetailItem label="Buddy">{onboarding.buddy_employee_id?.name || '—'}</DetailItem>
            <DetailItem label="Created By">{onboarding.created_by?.name || '—'}</DetailItem>
            <DetailItem label="Created">{formatDate(onboarding.createdAt, { withTime: true })}</DetailItem>
            <DetailItem label="Last Updated">{formatDate(onboarding.updatedAt, { withTime: true })}</DetailItem>
          </div>
        </SectionCard>

        <SectionCard
          title="Status"
          description="Onboarding status is updated separately from the onboarding details"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex w-full max-w-xs flex-col gap-1.5">
              <label htmlFor="onboarding-status" className="text-sm font-medium leading-none">
                Status
              </label>
              <Select value={status} onValueChange={handleStatusChange} disabled={savingStatus}>
                <SelectTrigger id="onboarding-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ONBOARDING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ONBOARDING_STATUS_LABELS[s] || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {savingStatus ? <p className="pb-2.5 text-xs text-muted-foreground">Updating status...</p> : null}
          </div>
        </SectionCard>

        <SectionCard
          title="Checklist Tasks"
          description={`${taskCount} task${taskCount === 1 ? '' : 's'} in this checklist template`}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assigned Role</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checklistItems.length === 0 ? (
                  <TableEmptyRow
                    colSpan={6}
                    label="This checklist has no tasks yet. Add them from Onboarding Checklists."
                  />
                ) : (
                  checklistItems.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">{item.task_name || '—'}</TableCell>
                      <TableCell>
                        {item.category ? (
                          <Badge variant="outline" className="text-[10px]">
                            {item.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{item.assigned_to_role || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {item.due_day ? `Day ${item.due_day}` : '—'}
                      </TableCell>
                      <TableCell>
                        {item.is_required ? (
                          <Badge variant="success">Required</Badge>
                        ) : (
                          <Badge variant="secondary">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <span className="block whitespace-pre-wrap text-sm text-muted-foreground">
                          {item.description || '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tasks come from the checklist template. Per-employee task completion is not stored, so progress is tracked
            through the onboarding status above.
          </p>
        </SectionCard>
      </div>
    </PageTemplate>
  );
}
