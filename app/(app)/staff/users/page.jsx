'use client';

import { useState } from 'react';
import HrCrudPage from '@/components/hr/hr-crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Mail, Shield, Calendar, X } from 'lucide-react';

export default function StaffUsersPage() {
  const [resetRow, setResetRow] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleResetSave(e) {
    e.preventDefault();
    if (!resetRow) return;
    const id = resetRow._id || resetRow.id;
    if (!newPassword || newPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    setResetSaving(true);
    setResetError('');
    try {
      const res = await fetch(`/api/users/${id}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: newPassword, password_confirmation: confirmPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to reset password');
      setResetRow(null);
      setNewPassword('');
      setConfirmPassword('');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetSaving(false);
    }
  }

  return (
    <>
      <HrCrudPage
        key={refreshKey}
        title="Users"
        description="Manage system users and their role assignments"
        apiEndpoint="/api/users"
        itemKey="users"
        searchPlaceholder="Search users..."
        createLabel="Add User"
        sortable
        perPageOptions={[10, 25, 50]}
        toggleStatus
        statusTabs={{
          tabs: [
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'suspended', label: 'Suspended' },
          ],
          countsKey: 'statusCounts',
        }}
        filters={[
          {
            name: 'role',
            label: 'Role',
            placeholder: 'All Roles',
            optionsEndpoint: '/api/roles',
            optionsKey: 'roles',
            optionLabel: 'name',
            optionValue: 'name',
          },
        ]}
        rowActions={[
          {
            label: 'View',
            variant: 'outline',
            onClick: (row) => setViewingUser(row),
          },
          {
            label: 'Reset Password',
            variant: 'outline',
            onClick: (row) => {
              setResetRow(row);
              setNewPassword('');
              setConfirmPassword('');
              setResetError('');
            },
          },
        ]}
        columns={[
          {
            key: 'name',
            label: 'Name',
            sortable: true,
            render: (value, row) => (
              <div className="flex items-center gap-2">
                {row?.avatar ? (
                  <img src={row.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-white text-xs font-medium dark:bg-brand-charcoal">
                    {String(value || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
                <div>
                  <div className="font-medium">{value || '—'}</div>
                  {row?.email ? <div className="text-sm text-muted-foreground">{row.email}</div> : null}
                </div>
              </div>
            ),
          },
          { key: 'role', label: 'Role' },
          { key: 'status', label: 'Status' },
          { key: 'createdAt', label: 'Joined', sortable: true },
        ]}
        fields={[
          { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. John Doe' },
          { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'e.g. john@example.com' },
          { name: 'avatar', label: 'Avatar URL', type: 'text', placeholder: 'https://...' },
          {
            name: 'password',
            label: 'Password',
            type: 'password',
            required: true,
            createOnly: true,
            placeholder: 'Enter password (min 6 characters)',
          },
          {
            name: 'password_confirmation',
            label: 'Confirm Password',
            type: 'password',
            required: true,
            createOnly: true,
            placeholder: 'Re-enter password',
          },
          {
            name: 'role',
            label: 'Role',
            type: 'select',
            required: true,
            placeholder: 'Select Role',
            optionsEndpoint: '/api/roles',
            optionsKey: 'roles',
            optionLabel: 'name',
            optionValue: 'name',
          },
        ]}
      />

      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                  <AvatarImage src={viewingUser.avatar || ''} alt={viewingUser.name} />
                  <AvatarFallback className="text-xl font-semibold">
                    {String(viewingUser.name || 'U')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">{viewingUser.name || '—'}</h2>
                  <p className="text-sm text-muted-foreground">{viewingUser.email || '—'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={viewingUser.status === 'active' ? 'success' : viewingUser.status === 'suspended' ? 'destructive' : 'secondary'}>
                      {viewingUser.status || '—'}
                    </Badge>
                    {viewingUser.role && <Badge variant="outline">{viewingUser.role}</Badge>}
                    {viewingUser.type && <Badge variant="outline">{viewingUser.type}</Badge>}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Name</div>
                  <div className="text-sm font-medium">{viewingUser.name || '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="text-sm font-medium break-all">{viewingUser.email || '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Role</div>
                  <div className="text-sm font-medium">{viewingUser.role || '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Type</div>
                  <div className="text-sm font-medium">{viewingUser.type || '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3 sm:col-span-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Joined</div>
                  <div className="text-sm font-medium">
                    {viewingUser.createdAt ? new Date(viewingUser.createdAt).toLocaleDateString() : '—'}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end border-t p-4">
              <Button variant="outline" onClick={() => setViewingUser(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {resetRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Reset Password</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Set a new password for {resetRow.name} ({resetRow.email})
            </p>
            {resetError && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {resetError}
              </div>
            )}
            <form onSubmit={handleResetSave} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-password" required>
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-password" required>
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setResetRow(null)} disabled={resetSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={resetSaving}>
                  {resetSaving ? 'Saving...' : 'Reset Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
