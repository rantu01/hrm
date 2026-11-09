'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { PageTemplate } from '@/components/page-template';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Modal,
  ErrorBanner,
  SuccessBanner,
  Field,
  FilterSelect,
  Pagination,
  StatusBadge,
  StatCard,
  TableEmptyRow,
  TableLoadingRow,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import { useRecruitmentList, useOptionList } from '@/components/recruitment/use-recruitment-list';
const MEETING_STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
import { CalendarDays, Clock, Eye, Edit, Trash2, Plus } from 'lucide-react';

const RECURRENCE_OPTIONS = ['None', 'Daily', 'Weekly', 'Monthly'];

const emptyForm = {
  title: '',
  description: '',
  type_id: '',
  room_id: '',
  meeting_date: '',
  start_time: '',
  end_time: '',
  agenda: '',
  recurrence: 'None',
  recurrence_end_date: '',
  organizer_id: '',
  status: 'Scheduled',
};

function toDateInput(value) {
  if (!value) return '';
  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInput(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export default function MeetingsListPage() {
  const list = useRecruitmentList('/api/meetings', 'meetings', {
    initialFilters: { status: 'all' },
    sortField: 'meeting_date',
    sortDirection: 'asc',
  });

  const { options: typeOptions } = useOptionList('/api/meetings/types', 'meetingTypes', { status: 'active' });
  const { options: roomOptions } = useOptionList('/api/meetings/rooms', 'meetingRooms', { status: 'active' });
  const { options: userOptions } = useOptionList('/api/users', 'users', { status: 'active' });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [newStatus, setNewStatus] = useState('Scheduled');

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      title: item.title || '',
      description: item.description || '',
      type_id: item.type_id?._id || item.type_id || '',
      room_id: item.room_id?._id || item.room_id || '',
      meeting_date: toDateInput(item.meeting_date),
      start_time: toTimeInput(item.start_time),
      end_time: toTimeInput(item.end_time),
      agenda: item.agenda || '',
      recurrence: item.recurrence || 'None',
      recurrence_end_date: toDateInput(item.recurrence_end_date),
      organizer_id: item.organizer_id?._id || item.organizer_id || '',
      status: item.status || 'Scheduled',
    });
    setFormError('');
    setModalOpen(true);
  }

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form };
      if (!payload.room_id) delete payload.room_id;
      if (!payload.recurrence_end_date) delete payload.recurrence_end_date;
      if (!payload.organizer_id) delete payload.organizer_id;
      const url = editing ? `/api/meetings/${editing._id}` : '/api/meetings';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to save'));
      const json = await res.json().catch(() => ({}));
      setModalOpen(false);
      setSuccess(json.message || (editing ? 'Meeting updated.' : 'Meeting created.'));
      list.refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setBusyId(item._id);
    setSuccess('');
    try {
      const res = await fetch(`/api/meetings/${item._id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete'));
      setSuccess('Meeting deleted successfully.');
      list.refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleStatusUpdate() {
    if (!statusModal) return;
    setBusyId(statusModal._id);
    try {
      const res = await fetch(`/api/meetings/${statusModal._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to update status'));
      const json = await res.json().catch(() => ({}));
      setStatusModal(null);
      setSuccess(json.message || 'Status updated.');
      list.refresh();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const statusCounts = list.statusCounts || {};

  return (
    <PageTemplate
      title="Meetings"
      description="Schedule and manage team meetings."
      actions={[{ label: 'Schedule Meeting', variant: 'default', onClick: openCreate, icon: <Plus className="mr-1 h-4 w-4" /> }]}
    >
      <div className="flex flex-col gap-4">
        {formError ? <ErrorBanner message={formError} /> : null}
        {success ? <SuccessBanner message={success} /> : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Total" value={statusCounts.all ?? 0} icon={CalendarDays} accent="blue" />
          <StatCard label="Scheduled" value={statusCounts.Scheduled ?? 0} icon={Clock} accent="blue" />
          <StatCard label="In Progress" value={statusCounts['In Progress'] ?? 0} icon={Clock} accent="amber" />
          <StatCard label="Completed" value={statusCounts.Completed ?? 0} icon={Clock} accent="emerald" />
          <StatCard label="Cancelled" value={statusCounts.Cancelled ?? 0} icon={Clock} accent="rose" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search meetings..."
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            className="max-w-sm"
          />
          <FilterSelect
            placeholder="Status"
            ariaLabel="Status"
            value={list.filters.status || 'all'}
            onValueChange={(v) => list.setFilter('status', v)}
            options={[
              { value: 'all', label: 'All Statuses' },
              ...MEETING_STATUSES.map((s) => ({ value: s, label: s })),
            ]}
          />
          <Input
            type="date"
            value={list.filters.date || ''}
            onChange={(e) => list.setFilter('date', e.target.value)}
            className="w-[180px]"
            aria-label="Date"
          />
          <Select
            value={String(list.perPage)}
            onValueChange={(v) => {
              list.setPerPage(Number(v) || 10);
              list.setPage(1);
            }}
          >
            <SelectTrigger className="w-[130px]">
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

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.loading ? (
                <TableLoadingRow colSpan={6} />
              ) : list.items.length === 0 ? (
                <TableEmptyRow colSpan={6} message="No meetings found." />
              ) : (
                list.items.map((m) => (
                  <TableRow key={m._id}>
                    <TableCell className="font-medium">
                      <Link href={`/meetings/${m._id}`} className="hover:underline">{m.title}</Link>
                    </TableCell>
                    <TableCell>{m.type_id?.name || '—'}</TableCell>
                    <TableCell>{m.meeting_date ? new Date(m.meeting_date).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>{m.start_time} – {m.end_time}</TableCell>
                    <TableCell>
                      <StatusBadge status={m.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setStatusModal(m); setNewStatus(m.status); }}
                          title="Update status"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" asChild title="View">
                          <Link href={`/meetings/${m._id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(m)} disabled={busyId === m._id} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination
          page={list.page}
          pages={list.pages}
          total={list.total}
          perPage={list.perPage}
          onPage={list.setPage}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Meeting' : 'Schedule Meeting'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {formError ? <ErrorBanner message={formError} /> : null}
          <Field label="Title" required>
            <Input value={form.title} onChange={(e) => setField('title', e.target.value)} required />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={2} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Meeting Type" required>
              <Select value={form.type_id || 'none'} onValueChange={(v) => setField('type_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select type</SelectItem>
                  {typeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Room">
              <Select value={form.room_id || 'none'} onValueChange={(v) => setField('room_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {roomOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Date" required>
              <Input type="date" value={form.meeting_date} onChange={(e) => setField('meeting_date', e.target.value)} required />
            </Field>
            <Field label="Start Time" required>
              <Input type="time" value={form.start_time} onChange={(e) => setField('start_time', e.target.value)} required />
            </Field>
            <Field label="End Time" required>
              <Input type="time" value={form.end_time} onChange={(e) => setField('end_time', e.target.value)} required />
            </Field>
          </div>
          <Field label="Agenda">
            <Textarea value={form.agenda} onChange={(e) => setField('agenda', e.target.value)} rows={2} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Recurrence">
              <Select value={form.recurrence} onValueChange={(v) => setField('recurrence', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Recurrence End Date">
              <Input type="date" value={form.recurrence_end_date} onChange={(e) => setField('recurrence_end_date', e.target.value)} />
            </Field>
          </div>
          <Field label="Organizer">
            <Select value={form.organizer_id || 'none'} onValueChange={(v) => setField('organizer_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select organizer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Current user</SelectItem>
                {userOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {editing ? (
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEETING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Schedule'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title="Update Status" size="sm">
        <div className="space-y-4">
          <Field label="Status">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEETING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStatusModal(null)}>Cancel</Button>
            <Button onClick={handleStatusUpdate} disabled={busyId === statusModal?._id}>Update</Button>
          </div>
        </div>
      </Modal>
    </PageTemplate>
  );
}
