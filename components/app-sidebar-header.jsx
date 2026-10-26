'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, PanelLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarTrigger } from './app-sidebar';

export function AppSidebarHeader({ breadcrumbs = [] }) {
    const pathname = usePathname();

    return (
        <header className="border-sidebar-border/50 flex h-14 shrink-0 items-center gap-2 border-b px-[10px] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 lg:px-[50px] print:hidden">
            <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent lg:h-7 lg:w-7">
                        <Menu className="h-5 w-5 lg:hidden" />
                        <PanelLeft className="hidden h-4 w-4 lg:block" />
                    </SidebarTrigger>
                    {breadcrumbs.length > 0 && (
                        <nav className="flex items-center gap-1 text-sm">
                            {breadcrumbs.map((crumb, index) => (
                                <span key={index} className="flex items-center gap-1">
                                    {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                    {crumb.href ? (
                                        <Link
                                            href={crumb.href}
                                            className={cn(
                                                'hover:text-foreground transition-colors',
                                                index === breadcrumbs.length - 1
                                                    ? 'text-foreground font-medium'
                                                    : 'text-muted-foreground'
                                            )}
                                        >
                                            {crumb.title}
                                        </Link>
                                    ) : (
                                        <span
                                            className={cn(
                                                index === breadcrumbs.length - 1
                                                    ? 'text-foreground font-medium'
                                                    : 'text-muted-foreground'
                                            )}
                                        >
                                            {crumb.title}
                                        </span>
                                    )}
                                </span>
                            ))}
                        </nav>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Page actions slot */}
                </div>
            </div>
        </header>
    );
}
