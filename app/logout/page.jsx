'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLogo } from '@/components/app-logo';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } catch {
        // Cookie may already be gone; still redirect to login.
      } finally {
        router.push('/login');
        router.refresh();
      }
    })();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <AppLogo imageClassName="h-9" />
      <p className="text-sm text-muted-foreground">Signing out...</p>
    </div>
  );
}
