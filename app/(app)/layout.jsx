import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppContent } from '@/components/app-content';
import { AppSidebarHeader } from '@/components/app-sidebar-header';

export const metadata = {
  title: 'Dashboard - LAMHA Tech',
};

export default function AppLayout({ children }) {
  return (
    <AppShell variant="sidebar">
      <Suspense fallback={null}>
        <AppSidebar />
      </Suspense>
      <AppContent variant="sidebar" className="px-4 py-6 bg-brand-white dark:bg-brand-charcoal">
        <Suspense fallback={null}>
          <AppSidebarHeader />
        </Suspense>
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
          {children}
        </Suspense>
      </AppContent>
    </AppShell>
  );
}
