'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Lock, Upload, X, Mail, Shield, Calendar } from 'lucide-react';

function formatDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
}

function getInitials(name) {
    if (!name) return 'U';
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState({ name: '', email: '', avatar: '' });
    const [password, setPassword] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [profileMessage, setProfileMessage] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/profile', { credentials: 'include' });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || 'Failed to load profile');
                setUser(json.user || null);
                setProfile({
                    name: json.user?.name || '',
                    email: json.user?.email || '',
                    avatar: json.user?.avatar || '',
                });
            } catch (err) {
                setUser(null);
                setProfileMessage(err.message);
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
            if (json.user) {
                setUser(json.user);
                setProfile({
                    name: json.user?.name || '',
                    email: json.user?.email || '',
                    avatar: json.user?.avatar || '',
                });
            }
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

    const displayName = user?.name || profile.name || 'User';
    const displayEmail = user?.email || profile.email || '';

    return (
        <PageTemplate title="Profile" description="View and manage your personal profile information.">
            {loading ? (
                <Card className="p-6">Loading...</Card>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Profile summary */}
                    <Card className="lg:col-span-1">
                        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-yellow text-3xl font-bold text-brand-charcoal">
                                {profile.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={profile.avatar} alt={displayName} className="h-full w-full object-cover" />
                                ) : (
                                    getInitials(displayName)
                                )}
                            </div>
                            <div className="min-w-0">
                                <h2 className="break-words text-xl font-bold">{displayName}</h2>
                                <p className="break-all text-sm text-muted-foreground">{displayEmail}</p>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {user?.role && <Badge variant="outline">{user.role}</Badge>}
                                {user?.type && <Badge variant="secondary">{user.type}</Badge>}
                                {user?.status && (
                                    <Badge variant={user.status === 'active' ? 'success' : 'destructive'}>
                                        {user.status}
                                    </Badge>
                                )}
                            </div>
                            <div className="w-full border-t pt-4 text-left text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>Member since {formatDate(user?.createdAt)}</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                                    <Shield className="h-4 w-4" />
                                    <span>{user?.type === 'superadmin' ? 'Super Administrator' : 'User account'}</span>
                                </div>
                            </div>
                            <div className="flex w-full gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => router.push('/settings')}>
                                    Settings
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Edit profile */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" /> Profile Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
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
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                className="pl-10"
                                                value={profile.email}
                                                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                                                required
                                            />
                                        </div>
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
                                            {savingProfile ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                        {profileMessage && <span className="text-sm text-muted-foreground">{profileMessage}</span>}
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lock className="h-5 w-5" /> Update Password
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
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
                                            {savingPassword ? 'Saving...' : 'Update Password'}
                                        </Button>
                                        {passwordMessage && <span className="text-sm text-muted-foreground">{passwordMessage}</span>}
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Account Details</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground">Name</p>
                                    <p className="mt-1 text-sm font-medium break-words">{displayName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground">Email</p>
                                    <p className="mt-1 text-sm font-medium break-all">{displayEmail}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground">Role</p>
                                    <p className="mt-1 text-sm font-medium">{user?.role || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground">Type</p>
                                    <p className="mt-1 text-sm font-medium">{user?.type || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground">Status</p>
                                    <p className="mt-1 text-sm font-medium">{user?.status || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground">Last Updated</p>
                                    <p className="mt-1 text-sm font-medium">{formatDate(user?.updatedAt)}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </PageTemplate>
    );
}