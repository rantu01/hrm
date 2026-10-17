import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppContent } from '@/components/app-content';
import { AppSidebarHeader } from '@/components/app-sidebar-header';

export const metadata = {
  title: 'Dashboard - HRM SaaS',
};

export default function AppLayout({ children }) {
  return (
    <AppShell variant="sidebar">
      <Suspense fallback={null}>
        <AppSidebar />
      </Suspense>
      <AppContent variant="sidebar" className="bg-[#F8FAFE] dark:bg-black">
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
