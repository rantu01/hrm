'use client';

import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Lock, Upload, X } from 'lucide-react';
import { useRef } from 'react';

export default function SettingsPage() {
  const [active, setActive] = useState('profile');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ name: '', email: '', avatar: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [password, setPassword] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile', { credentials: 'include' });
        const json = await res.json();
        setUser(json.user || null);
        setProfile({
          name: json.user?.name || '',
          email: json.user?.email || '',
          avatar: json.user?.avatar || '',
        });
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profile),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to update profile');
      setProfileMessage(json.message || 'Profile updated successfully');
      if (json.user) setUser(json.user);
    } catch (err) {
      setProfileMessage(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileMessage('Please select an image file');
      return;
    }
    setUploadingAvatar(true);
    setProfileMessage('');
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Upload failed');
      setProfile((p) => ({ ...p, avatar: json.url }));
      setProfileMessage(json.message || 'Avatar uploaded successfully');
    } catch (err) {
      setProfileMessage(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMessage('');
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(password),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to update password');
      setPasswordMessage(json.message || 'Password updated successfully');
      setPassword({ current_password: '', password: '', password_confirmation: '' });
    } catch (err) {
      setPasswordMessage(err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <PageTemplate title="Settings" description="Manage your account settings.">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card className="p-3 flex flex-col gap-2">
            <Button
              variant="ghost"
              className={`w-full justify-start ${active === 'profile' ? 'bg-muted font-medium' : ''}`}
              onClick={() => setActive('profile')}
            >
              <User className="h-4 w-4 mr-2" /> Profile
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start ${active === 'password' ? 'bg-muted font-medium' : ''}`}
              onClick={() => setActive('password')}
            >
              <Lock className="h-4 w-4 mr-2" /> Password
            </Button>
          </Card>
        </div>

        <div className="md:col-span-3">
          {loading ? (
            <Card className="p-6">Loading...</Card>
          ) : active === 'profile' ? (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
              <form onSubmit={handleProfileSave} className="flex flex-col gap-4 max-w-xl">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Avatar</Label>
                  {profile.avatar && (
                    <div className="mb-2">
                      <img src={profile.avatar} alt="Avatar" className="h-16 w-16 rounded-full object-cover border" />
                    </div>
                  )}
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) uploadAvatar(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {uploadingAvatar ? 'Uploading...' : 'Click or drag & drop an image to upload'}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadAvatar(file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      id="avatar"
                      value={profile.avatar}
                      onChange={(e) => setProfile((p) => ({ ...p, avatar: e.target.value }))}
                      placeholder="Or paste an avatar URL"
                    />
                    {profile.avatar && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setProfile((p) => ({ ...p, avatar: '' }))}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={savingProfile}>
                    {savingProfile ? 'Saving...' : 'Save'}
                  </Button>
                  {profileMessage && <span className="text-sm text-muted-foreground">{profileMessage}</span>}
                </div>
              </form>
            </Card>
          ) : (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Update Password</h2>
              <form onSubmit={handlePasswordSave} className="flex flex-col gap-4 max-w-xl">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={password.current_password}
                    onChange={(e) => setPassword((p) => ({ ...p, current_password: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password.password}
                    onChange={(e) => setPassword((p) => ({ ...p, password: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password_confirmation">Confirm Password</Label>
                  <Input
                    id="password_confirmation"
                    type="password"
                    value={password.password_confirmation}
                    onChange={(e) => setPassword((p) => ({ ...p, password_confirmation: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={savingPassword}>
                    {savingPassword ? 'Saving...' : 'Save'}
                  </Button>
                  {passwordMessage && <span className="text-sm text-muted-foreground">{passwordMessage}</span>}
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
    </PageTemplate>
  );
}