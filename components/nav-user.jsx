'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronsUpDown, User, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from './app-sidebar';

export function NavUser({ user }) {
    const [isOpen, setIsOpen] = useState(false);

    const currentUser = user || {
        name: 'User',
        email: 'user@example.com',
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <div className="relative">
                    <SidebarMenuButton
                        size="lg"
                        className="text-sidebar-accent-foreground group flex items-center gap-2 cursor-pointer"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <div className="flex size-8 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
                            <span className="text-xs font-medium text-black dark:text-white">
                                {getInitials(currentUser.name)}
                            </span>
                        </div>
                        <div className="flex-1 text-left">
                            <div className="text-sm font-medium truncate">{currentUser.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{currentUser.email}</div>
                        </div>
                        <ChevronsUpDown className="size-4" />
                    </SidebarMenuButton>

                    {isOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                            <div className="absolute bottom-full left-0 right-0 z-50 mb-1 min-w-56 rounded-lg border bg-popover p-1 shadow-md">
                                <div className="border-b px-3 py-2">
                                    <div className="text-sm font-medium">{currentUser.name}</div>
                                    <div className="text-xs text-muted-foreground">{currentUser.email}</div>
                                </div>
                                <div className="p-1">
                                    <Link
                                        href="/profile"
                                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <User className="size-4" />
                                        Profile
                                    </Link>
                                    <Link
                                        href="/settings"
                                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Settings className="size-4" />
                                        Settings
                                    </Link>
                                    <div className="my-1 border-t" />
                                    <button
                                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
                                        onClick={() => {
                                            // Handle logout
                                            window.location.href = '/logout';
                                        }}
                                    >
                                        <LogOut className="size-4" />
                                        Log Out
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
