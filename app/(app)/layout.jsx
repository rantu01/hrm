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
      <AppSidebar />
      <AppContent variant="sidebar" className="bg-[#F8FAFE] dark:bg-black">
        <AppSidebarHeader />
        {children}
      </AppContent>
    </AppShell>
  );
}
