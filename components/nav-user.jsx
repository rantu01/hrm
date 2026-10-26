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
                        className="text-sidebar-foreground group flex items-center gap-2 cursor-pointer hover:bg-brand-yellow hover:text-brand-charcoal"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <div className="flex size-8 items-center justify-center rounded-full bg-brand-yellow">
                            <span className="text-xs font-medium text-brand-charcoal">
                                {getInitials(currentUser.name)}
                            </span>
                        </div>
                        <div className="flex-1 text-left">
                            <div className="text-sm font-medium truncate">{currentUser.name}</div>
                            <div className="text-xs text-brand-white/70 truncate">{currentUser.email}</div>
                        </div>
                        <ChevronsUpDown className="size-4" />
                    </SidebarMenuButton>

                    {isOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                            <div className="absolute bottom-full left-0 right-0 z-50 mb-1 min-w-56 rounded-lg border border-brand-charcoal/20 bg-brand-white p-1 text-brand-charcoal shadow-md">
                                <div className="border-b border-brand-charcoal/20 px-3 py-2">
                                    <div className="text-sm font-medium">{currentUser.name}</div>
                                    <div className="text-xs text-brand-charcoal/70">{currentUser.email}</div>
                                </div>
                                <div className="p-1">
                                    <Link
                                        href="/profile"
                                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-brand-charcoal hover:bg-brand-charcoal hover:text-brand-yellow cursor-pointer"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <User className="size-4" />
                                        Profile
                                    </Link>
                                    <Link
                                        href="/settings"
                                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-brand-charcoal hover:bg-brand-charcoal hover:text-brand-yellow cursor-pointer"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Settings className="size-4" />
                                        Settings
                                    </Link>
                                    <div className="my-1 border-t border-brand-charcoal/20" />
                                    <button
                                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-brand-red hover:bg-brand-red hover:text-brand-white cursor-pointer"
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
