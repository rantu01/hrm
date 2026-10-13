'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, Bell, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppLogo } from './app-logo';

const mainNavItems = [
    { title: 'Dashboard', href: '/dashboard' },
];

const rightNavItems = [
    { title: 'Documentation', href: '/docs' },
];

export function AppHeader({ breadcrumbs = [] }) {
    const pathname = usePathname();

    return (
        <>
            <div className="border-sidebar-border/80 border-b">
                <div className="mx-auto flex h-16 items-center px-4 md:max-w-7xl">
                    {/* Mobile Menu Toggle */}
                    <div className="lg:hidden">
                        <button className="mr-2 flex h-[34px] w-[34px] items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
                            <Menu className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center space-x-2">
                        <AppLogo />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="ml-6 hidden h-full items-center space-x-6 lg:flex">
                        {mainNavItems.map((item) => (
                            <Link
                                key={item.title}
                                href={item.href}
                                className={cn(
                                    'flex h-9 items-center px-3 text-sm font-medium transition-colors hover:text-foreground cursor-pointer',
                                    pathname === item.href || pathname.startsWith(item.href + '/')
                                        ? 'text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                                        : 'text-neutral-600 dark:text-neutral-400'
                                )}
                            >
                                {item.title}
                            </Link>
                        ))}
                    </div>

                    {/* Right Section */}
                    <div className="ml-auto flex items-center space-x-2">
                        <div className="relative flex items-center space-x-1">
                            <button className="flex h-9 w-9 items-center justify-center rounded-md bg-transparent p-0 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
                                <Search className="size-5 opacity-80" />
                            </button>
                            <button className="relative flex h-9 w-9 items-center justify-center rounded-md bg-transparent p-0 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
                                <Bell className="size-5 opacity-80" />
                                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
                            </button>
                            <div className="hidden lg:flex">
                                {rightNavItems.map((item) => (
                                    <a
                                        key={item.title}
                                        href={item.href}
                                        className="group ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md bg-transparent p-0 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                                    >
                                        <span className="sr-only">{item.title}</span>
                                        <ChevronRight className="size-5 opacity-80 group-hover:opacity-100" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* User Avatar */}
                        <button className="flex size-10 items-center justify-center rounded-full p-1 cursor-pointer">
                            <div className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                                <span className="text-xs font-medium text-black dark:text-white">
                                    U
                                </span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Breadcrumbs */}
            {breadcrumbs.length > 1 && (
                <div className="border-sidebar-border/70 flex w-full border-b">
                    <div className="mx-auto flex h-12 w-full items-center justify-start px-4 text-neutral-500 md:max-w-7xl">
                        <nav className="flex items-center gap-1 text-sm">
                            {breadcrumbs.map((crumb, index) => (
                                <span key={index} className="flex items-center gap-1">
                                    {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                    {crumb.href ? (
                                        <Link
                                            href={crumb.href}
                                            className="hover:text-foreground transition-colors text-muted-foreground"
                                        >
                                            {crumb.title}
                                        </Link>
                                    ) : (
                                        <span className="text-muted-foreground">{crumb.title}</span>
                                    )}
                                </span>
                            ))}
                        </nav>
                    </div>
                </div>
            )}
        </>
    );
}
