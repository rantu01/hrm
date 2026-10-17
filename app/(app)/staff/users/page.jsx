'use client';

import { useState } from 'react';
import HrCrudPage from '@/components/hr/hr-crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function StaffUsersPage() {
  const [resetRow, setResetRow] = useState(null);
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
        viewConfig={{
          title: 'User Details',
          fields: [
            { key: 'avatar', label: 'Avatar' },
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status', type: 'status' },
            { key: 'createdAt', label: 'Joined', type: 'date' },
          ],
        }}
        rowActions={[
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium dark:bg-neutral-700">
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

      {resetRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
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
