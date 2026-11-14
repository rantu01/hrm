'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function SessionGuard() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response && response.status === 401) {
        try {
          const clone = response.clone();
          const json = await clone.json().catch(() => null);
          const message = json?.message || json?.error || '';
          if (String(message).toLowerCase().includes('no token provided')) {
            setOpen(true);
          }
        } catch {
          // ignore non-JSON responses
        }
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    window.location.href = '/login';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">Session expired</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No token provided, authorization denied. You have been logged out for security.
        </p>
        <div className="mt-6 flex items-center justify-end">
          <Button onClick={handleLogout}>Log in again</Button>
        </div>
      </div>
    </div>
  );
}