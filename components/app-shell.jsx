'use client';

import { useState, useCallback, useEffect } from 'react';
import { SidebarProvider } from './app-sidebar';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function AppShell({ children, variant = 'header' }) {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const cookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`));
      if (cookie) {
        setIsOpen(cookie.split('=')[1] !== 'false');
      }
    }
  }, []);

  const handleSidebarChange = useCallback((open) => {
    setIsOpen(open);
    if (typeof document !== 'undefined') {
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    }
  }, []);

  if (variant === 'header') {
    return (
      <div className="flex min-h-screen w-full flex-col">
        {children}
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={isOpen} open={isOpen} onOpenChange={handleSidebarChange}>
      <div className="flex w-full flex-row">
        {children}
      </div>
    </SidebarProvider>
  );
}
