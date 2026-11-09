'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Modal,
  ErrorBanner,
  SuccessBanner,
  Field,
  StatusBadge,
  TableEmptyRow,
  TableLoadingRow,
  readApiError,
} from '@/components/recruitment/recruitment-ui';
import { useOptionList } from '@/components/recruitment/use-recruitment-list';
import { ArrowLeft, Plus, Trash2, Edit, Users, FileText, CheckSquare } from 'lucide-react';

const MEETING_STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
const ATTENDEE_TYPES = ['Required', 'Optional'];
const RSVP_STATUSES = ['Pending', 'Accepted', 'Declined', 'Tentative'];
const ATTENDANCE_STATUSES = ['Not Attended', 'Present', 'Late', 'Left Early'];
const MINUTE_TYPES = ['Discussion', 'Decision', 'Action Item', 'Note'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const ACTION_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Overdue'];

export default function MeetingDetailPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [attendees, setAttendees] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [minutes, setMinutes] = useState([]);
  const [minutesLoading, setMinutesLoading] = useState(false);
  const [actionItems, setActionItems] = useState([]);
  const [actionItemsLoading, setActionItemsLoading] = useState(false);

  const { options: userOptions } = useOptionList('/api/users', 'users', { status: 'active' });

  // modals
  const [addAttendeeOpen, setAddAttendeeOpen] = useState(false);
  const [attendeeForm, setAttendeeForm] = useState({ user_id: '', type: 'Required' });
  const [addMinuteOpen, setAddMinuteOpen] = useState(false);
  const [minuteForm, setMinuteForm] = useState({ topic: '', content: '', type: 'Discussion', recorded_by: '', recorded_at: '' });
  const [editingMinute, setEditingMinute] = useState(null);
  const [addAiOpen, setAddAiOpen] = useState(false);
  const [aiForm, setAiForm] = useState({ title: '', description: '', assigned_to: '', due_date: '', priority: 'Medium', status: 'Not Started', progress_percentage: 0, notes: '' });

  const fetchMeeting = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/meetings/${id}`, { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to fetch meeting');
      setMeeting(json.meeting);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAttendees = useCallback(async () => {
    if (!id) return;
    setAttendeesLoading(true);
    try {
      const res = await fetch(`/api/meetings/${id}/attendees?limit=100`, { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to fetch attendees');
      setAttendees(json.attendees || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setAttendeesLoading(false);
    }
  }, [id]);

  const fetchMinutes = useCallback(async () => {
    if (!id) return;
    setMinutesLoading(true);
    try {
      const res = await fetch(`/api/meetings/${id}/minutes?limit=100`, { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to fetch minutes');
      setMinutes(json.minutes || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setMinutesLoading(false);
    }
  }, [id]);

  const fetchActionItems = useCallback(async () => {
    if (!id) return;
    setActionItemsLoading(true);
    try {
      const res = await fetch(`/api/meetings/action-items?meeting_id=${id}&limit=100`, { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to fetch action items');
      setActionItems(json.actionItems || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setActionItemsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMeeting();
    fetchAttendees();
    fetchMinutes();
    fetchActionItems();
  }, [fetchMeeting, fetchAttendees, fetchMinutes, fetchActionItems]);

  async function handleAddAttendee(e) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/meetings/${id}/attendees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(attendeeForm),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to add participant'));
      setAddAttendeeOpen(false);
      setAttendeeForm({ user_id: '', type: 'Required' });
      setSuccess('Participant added.');
      fetchAttendees();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateAttendee(attendeeId, patch) {
    try {
      const res = await fetch(`/api/meetings/${id}/attendees/${attendeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to update participant'));
      fetchAttendees();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveAttendee(attendeeId) {
    if (!window.confirm('Remove this participant?')) return;
    try {
      const res = await fetch(`/api/meetings/${id}/attendees/${attendeeId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to remove participant'));
      setSuccess('Participant removed.');
      fetchAttendees();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddMinute(e) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/meetings/${id}/minutes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(minuteForm),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to add minute'));
      setAddMinuteOpen(false);
      setMinuteForm({ topic: '', content: '', type: 'Discussion', recorded_by: '', recorded_at: '' });
      setSuccess('Minute added.');
      fetchMinutes();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateMinute(e) {
    e.preventDefault();
    if (!editingMinute) return;
    try {
      const res = await fetch(`/api/meetings/${id}/minutes/${editingMinute._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(minuteForm),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to update minute'));
      setEditingMinute(null);
      setMinuteForm({ topic: '', content: '', type: 'Discussion', recorded_by: '', recorded_at: '' });
      setSuccess('Minute updated.');
      fetchMinutes();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteMinute(minuteId) {
    if (!window.confirm('Delete this minute?')) return;
    try {
      const res = await fetch(`/api/meetings/${id}/minutes/${minuteId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete minute'));
      setSuccess('Minute deleted.');
      fetchMinutes();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddActionItem(e) {
    e.preventDefault();
    try {
      const res = await fetch('/api/meetings/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...aiForm, meeting_id: id }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to add action item'));
      setAddAiOpen(false);
      setAiForm({ title: '', description: '', assigned_to: '', due_date: '', priority: 'Medium', status: 'Not Started', progress_percentage: 0, notes: '' });
      setSuccess('Action item added.');
      fetchActionItems();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteActionItem(aiId) {
    if (!window.confirm('Delete this action item?')) return;
    try {
      const res = await fetch(`/api/meetings/action-items/${aiId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete action item'));
      setSuccess('Action item deleted.');
      fetchActionItems();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <PageTemplate title="Meeting"><p>Loading...</p></PageTemplate>;
  if (error && !meeting) return <PageTemplate title="Meeting"><ErrorBanner message={error} /></PageTemplate>;
  if (!meeting) return <PageTemplate title="Meeting"><p>Not found.</p></PageTemplate>;

  return (
    <PageTemplate
      title={meeting.title}
      description="Meeting details, participants, minutes and action items."
      actions={[{ label: 'Back to Meetings', variant: 'outline', onClick: () => router.push('/meetings/list'), icon: <ArrowLeft className="mr-1 h-4 w-4" /> }]}
    >
      <div className="flex flex-col gap-6">
        {error ? <ErrorBanner message={error} /> : null}
        {success ? <SuccessBanner message={success} /> : null}

        <div className="rounded-lg border bg-card p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><span className="text-xs text-muted-foreground">Type</span><p className="font-medium">{meeting.type_id?.name || '—'}</p></div>
            <div><span className="text-xs text-muted-foreground">Room</span><p className="font-medium">{meeting.room_id?.name || '—'}</p></div>
            <div><span className="text-xs text-muted-foreground">Date</span><p className="font-medium">{meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString() : '—'}</p></div>
            <div><span className="text-xs text-muted-foreground">Time</span><p className="font-medium">{meeting.start_time} – {meeting.end_time} ({meeting.duration} min)</p></div>
            <div><span className="text-xs text-muted-foreground">Status</span><p><StatusBadge status={meeting.status} /></p></div>
            <div><span className="text-xs text-muted-foreground">Organizer</span><p className="font-medium">{meeting.organizer_id?.name || '—'}</p></div>
            <div className="md:col-span-2"><span className="text-xs text-muted-foreground">Description</span><p className="font-medium">{meeting.description || '—'}</p></div>
            <div className="md:col-span-2"><span className="text-xs text-muted-foreground">Agenda</span><p className="font-medium">{meeting.agenda || '—'}</p></div>
          </div>
        </div>

        {/* Participants */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4" /> Participants</h3>
            <Button size="sm" onClick={() => setAddAttendeeOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add</Button>
          </div>
          <div className="p-4">
            {attendeesLoading ? <TableLoadingRow colSpan={5} /> : attendees.length === 0 ? <TableEmptyRow colSpan={5} message="No participants yet." /> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">RSVP</th>
                      <th className="py-2 pr-4">Attendance</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendees.map((a) => (
                      <tr key={a._id} className="border-b">
                        <td className="py-2 pr-4">{a.user_id?.name || '—'}</td>
                        <td className="py-2 pr-4">
                          <Select value={a.type} onValueChange={(v) => handleUpdateAttendee(a._id, { type: v })}>
                            <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{ATTENDEE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-4">
                          <Select value={a.rsvp_status} onValueChange={(v) => handleUpdateAttendee(a._id, { rsvp_status: v })}>
                            <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{RSVP_STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-4">
                          <Select value={a.attendance_status} onValueChange={(v) => handleUpdateAttendee(a._id, { attendance_status: v })}>
                            <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{ATTENDANCE_STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="py-2">
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveAttendee(a._id)}><Trash2 className="h-4 w-4" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Minutes */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4" /> Meeting Minutes</h3>
            <Button size="sm" onClick={() => { setEditingMinute(null); setMinuteForm({ topic: '', content: '', type: 'Discussion', recorded_by: '', recorded_at: '' }); setAddMinuteOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Add</Button>
          </div>
          <div className="p-4 space-y-3">
            {minutesLoading ? <p>Loading...</p> : minutes.length === 0 ? <p className="text-sm text-muted-foreground">No minutes yet.</p> : minutes.map((m) => (
              <div key={m._id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{m.topic} <span className="ml-2 text-xs text-muted-foreground">({m.type})</span></p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{m.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">By {m.recorded_by?.name || '—'} on {m.recorded_at ? new Date(m.recorded_at).toLocaleString() : ''}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingMinute(m); setMinuteForm({ topic: m.topic, content: m.content, type: m.type, recorded_by: m.recorded_by?._id || '', recorded_at: m.recorded_at ? new Date(m.recorded_at).toISOString().slice(0, 16) : '' }); setAddMinuteOpen(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteMinute(m._id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Items */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="flex items-center gap-2 font-semibold"><CheckSquare className="h-4 w-4" /> Action Items</h3>
            <Button size="sm" onClick={() => { setAiForm({ title: '', description: '', assigned_to: '', due_date: '', priority: 'Medium', status: 'Not Started', progress_percentage: 0, notes: '' }); setAddAiOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Add</Button>
          </div>
          <div className="p-4">
            {actionItemsLoading ? <p>Loading...</p> : actionItems.length === 0 ? <p className="text-sm text-muted-foreground">No action items yet.</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-4">Title</th>
                      <th className="py-2 pr-4">Assigned To</th>
                      <th className="py-2 pr-4">Due Date</th>
                      <th className="py-2 pr-4">Priority</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionItems.map((a) => (
                      <tr key={a._id} className="border-b">
                        <td className="py-2 pr-4 font-medium">{a.title}</td>
                        <td className="py-2 pr-4">{a.assigned_to?.name || '—'}</td>
                        <td className="py-2 pr-4">{a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}</td>
                        <td className="py-2 pr-4">{a.priority}</td>
                        <td className="py-2 pr-4"><StatusBadge status={a.status} /></td>
                        <td className="py-2">
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteActionItem(a._id)}><Trash2 className="h-4 w-4" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add attendee modal */}
      <Modal open={addAttendeeOpen} onClose={() => setAddAttendeeOpen(false)} title="Add Participant" size="sm">
        <form onSubmit={handleAddAttendee} className="space-y-4">
          <Field label="Participant" required>
            <Select value={attendeeForm.user_id || 'none'} onValueChange={(v) => setAttendeeForm({ ...attendeeForm, user_id: v === 'none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select user</SelectItem>
                {userOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Type">
            <Select value={attendeeForm.type} onValueChange={(v) => setAttendeeForm({ ...attendeeForm, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ATTENDEE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAddAttendeeOpen(false)}>Cancel</Button>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Modal>

      {/* Minute modal */}
      <Modal open={addMinuteOpen} onClose={() => setAddMinuteOpen(false)} title={editingMinute ? 'Edit Minute' : 'Add Minute'} size="md">
        <form onSubmit={editingMinute ? handleUpdateMinute : handleAddMinute} className="space-y-4">
          <Field label="Topic" required>
            <Input value={minuteForm.topic} onChange={(e) => setMinuteForm({ ...minuteForm, topic: e.target.value })} required />
          </Field>
          <Field label="Content" required>
            <Textarea value={minuteForm.content} onChange={(e) => setMinuteForm({ ...minuteForm, content: e.target.value })} rows={4} required />
          </Field>
          <Field label="Type">
            <Select value={minuteForm.type} onValueChange={(v) => setMinuteForm({ ...minuteForm, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MINUTE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Recorded By">
            <Select value={minuteForm.recorded_by || 'none'} onValueChange={(v) => setMinuteForm({ ...minuteForm, recorded_by: v === 'none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Current user</SelectItem>
                {userOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Recorded At">
            <Input type="datetime-local" value={minuteForm.recorded_at} onChange={(e) => setMinuteForm({ ...minuteForm, recorded_at: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAddMinuteOpen(false)}>Cancel</Button>
            <Button type="submit">{editingMinute ? 'Update' : 'Add'}</Button>
          </div>
        </form>
      </Modal>

      {/* Action item modal */}
      <Modal open={addAiOpen} onClose={() => setAddAiOpen(false)} title="Add Action Item" size="md">
        <form onSubmit={handleAddActionItem} className="space-y-4">
          <Field label="Title" required>
            <Input value={aiForm.title} onChange={(e) => setAiForm({ ...aiForm, title: e.target.value })} required />
          </Field>
          <Field label="Description">
            <Textarea value={aiForm.description} onChange={(e) => setAiForm({ ...aiForm, description: e.target.value })} rows={2} />
          </Field>
          <Field label="Assigned To" required>
            <Select value={aiForm.assigned_to || 'none'} onValueChange={(v) => setAiForm({ ...aiForm, assigned_to: v === 'none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select user</SelectItem>
                {userOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Due Date" required>
            <Input type="date" value={aiForm.due_date} onChange={(e) => setAiForm({ ...aiForm, due_date: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Priority">
              <Select value={aiForm.priority} onValueChange={(v) => setAiForm({ ...aiForm, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={aiForm.status} onValueChange={(v) => setAiForm({ ...aiForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACTION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={aiForm.notes} onChange={(e) => setAiForm({ ...aiForm, notes: e.target.value })} rows={2} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAddAiOpen(false)}>Cancel</Button>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Modal>
    </PageTemplate>
  );
}
