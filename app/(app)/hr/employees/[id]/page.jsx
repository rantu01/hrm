'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

function statusVariant(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'active' || s === 'verified') return 'success';
  if (s === 'probation' || s === 'pending') return 'secondary';
  if (s === 'inactive' || s === 'terminated' || s === 'rejected') return 'destructive';
  return 'outline';
}

function Field({ label, value }) {
  return (
    <div>
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground">{label}</h3>
      <p className="mt-1 break-words text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function refName(value) {
  if (!value) return '—';
  if (typeof value === 'object') return value.name || '—';
  return String(value);
}

export default function EmployeeDetailPage({ params }) {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [actioning, setActioning] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ password: '', password_confirmation: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const fetchEmployee = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/employees/${id}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to load employee');
      setEmployee(json.employee);
      setDocuments(Array.isArray(json.documents) ? json.documents : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEmployee();
  }, [fetchEmployee]);

  async function handleToggle() {
    if (!window.confirm('Toggle the login/employee status for this employee?')) return;
    setActioning(true);
    try {
      const res = await fetch(`/api/employees/${id}/toggle-status`, { method: 'PUT', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to toggle status');
      setEmployee(json.employee);
    } catch (err) {
      setError(err.message);
    } finally {
      setActioning(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete employee "${employee?.name}"? This also removes the linked login account.`)) return;
    setActioning(true);
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to delete');
      router.push('/hr/employees');
    } catch (err) {
      setError(err.message);
      setActioning(false);
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    if (pwForm.password.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    if (pwForm.password !== pwForm.password_confirmation) {
      setPwError('Password confirmation does not match');
      return;
    }
    setPwSaving(true);
    setPwError('');
    try {
      const res = await fetch(`/api/employees/${id}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(pwForm),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message || (Array.isArray(json.errors) ? json.errors.map((er) => er.msg).join(', ') : 'Failed to change password'));
      }
      setPwOpen(false);
      setPwForm({ password: '', password_confirmation: '' });
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteDocument(docId) {
    if (!window.confirm('Delete this document?')) return;
    try {
      const res = await fetch(`/api/employees/${id}/documents/${docId}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to delete document');
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleVerifyDocument(docId, verification_status) {
    try {
      const res = await fetch(`/api/employees/${id}/documents/${docId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ verification_status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to update document');
      setDocuments((prev) => prev.map((d) => (d._id === docId ? json.document : d)));
    } catch (err) {
      setError(err.message);
    }
  }

  const emp = employee || {};

  return (
    <PageTemplate
      title={employee?.name || 'Employee Details'}
      description="View detailed information for this employee."
      actions={[
        { label: 'Back', variant: 'outline', onClick: () => router.push('/hr/employees') },
        { label: 'Edit', variant: 'outline', onClick: () => id && router.push(`/hr/employees/${id}/edit`) },
      ]}
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading employee...</p>
      ) : error && !employee ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Profile header */}
          <Card>
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {emp.profile_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={emp.profile_image} alt={emp.name} className="h-full w-full object-cover" />
                ) : (
                  String(emp.name || '?').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-xl font-bold">{emp.name}</h2>
                <p className="break-words text-sm text-muted-foreground">{refName(emp.designation_id)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {emp.employee_id && <Badge variant="default">{emp.employee_id}</Badge>}
                  <Badge variant={statusVariant(emp.employee_status)}>{emp.employee_status || '—'}</Badge>
                  {emp.user && <Badge variant={emp.user.status === 'active' ? 'success' : 'destructive'}>Login: {emp.user.status}</Badge>}
                </div>
                <div className="mt-1 break-all text-sm text-muted-foreground">{emp.email}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setPwOpen(true)} disabled={!emp.user}>
                  Change Password
                </Button>
                <Button size="sm" variant="outline" onClick={handleToggle} disabled={actioning}>
                  Toggle Status
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDelete} disabled={actioning}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="banking">Banking</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Full Name" value={emp.name} />
                  <Field label="Employee ID" value={emp.employee_id} />
                  <Field label="Biometric Employee ID" value={emp.biometric_emp_id} />
                  <Field label="Email" value={emp.email} />
                  <Field label="Phone Number" value={emp.phone} />
                  <Field label="Date of Birth" value={formatDate(emp.date_of_birth)} />
                  <Field label="Gender" value={emp.gender ? emp.gender.charAt(0).toUpperCase() + emp.gender.slice(1) : ''} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="employment">
              <Card>
                <CardHeader>
                  <CardTitle>Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Branch" value={refName(emp.branch_id)} />
                  <Field label="Department" value={refName(emp.department_id)} />
                  <Field label="Designation" value={refName(emp.designation_id)} />
                  <Field label="Date of Joining" value={formatDate(emp.date_of_joining)} />
                  <Field label="Employment Type" value={emp.employment_type} />
                  <Field label="Employee Status" value={emp.employee_status} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Address Line 1" value={emp.address_line_1} />
                    <Field label="Address Line 2" value={emp.address_line_2} />
                    <Field label="City" value={emp.city} />
                    <Field label="State" value={emp.state} />
                    <Field label="Country" value={emp.country} />
                    <Field label="Postal Code" value={emp.postal_code} />
                  </div>
                  <div className="border-t pt-4">
                    <h3 className="mb-4 font-medium">Emergency Contact</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field label="Name" value={emp.emergency_contact_name} />
                      <Field label="Relationship" value={emp.emergency_contact_relationship} />
                      <Field label="Phone Number" value={emp.emergency_contact_number} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="banking">
              <Card>
                <CardHeader>
                  <CardTitle>Banking Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Bank Name" value={emp.bank_name} />
                  <Field label="Account Holder Name" value={emp.account_holder_name} />
                  <Field label="Account Number" value={emp.account_number} />
                  <Field label="Bank Identifier Code" value={emp.bank_identifier_code} />
                  <Field label="Bank Branch" value={emp.bank_branch} />
                  <Field label="Tax Payer ID" value={emp.tax_payer_id} />
                  <Field label="Base Salary" value={emp.base_salary ?? ''} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {documents.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No documents found.</p>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc._id} className="flex flex-col gap-2 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h4 className="break-words text-sm font-medium">{doc.document_type}</h4>
                          <p className="text-xs text-muted-foreground">
                            {doc.expiry_date ? `Expires: ${formatDate(doc.expiry_date)}` : 'No expiry date'}
                            {doc.file ? (
                              <>
                                {' · '}
                                <Link href={doc.file} target="_blank" className="underline">
                                  Open file
                                </Link>
                              </>
                            ) : null}
                          </p>
                          <div className="mt-1">
                            <Badge variant={statusVariant(doc.verification_status)}>{doc.verification_status}</Badge>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {doc.verification_status === 'pending' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleVerifyDocument(doc._id, 'verified')}>
                                Verify
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleVerifyDocument(doc._id, 'rejected')}>
                                Reject
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteDocument(doc._id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                  <p className="text-xs text-muted-foreground">
                    New documents can be added from the <Link href={`/hr/employees/${id}/edit`} className="underline">edit page</Link>.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {pwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Change Password — {employee?.name}</h2>
            {pwError && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {pwError}
              </div>
            )}
            <form onSubmit={handlePasswordSave} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pw-new" className="text-sm font-medium">
                  New Password
                </label>
                <Input
                  id="pw-new"
                  type="password"
                  placeholder="Min 8 characters"
                  value={pwForm.password}
                  onChange={(e) => setPwForm((p) => ({ ...p, password: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pw-confirm" className="text-sm font-medium">
                  Confirm Password
                </label>
                <Input
                  id="pw-confirm"
                  type="password"
                  placeholder="Repeat new password"
                  value={pwForm.password_confirmation}
                  onChange={(e) => setPwForm((p) => ({ ...p, password_confirmation: e.target.value }))}
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setPwOpen(false)} disabled={pwSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pwSaving}>
                  {pwSaving ? 'Saving...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}
