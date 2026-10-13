'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from './app-sidebar';

export function NavFooter({ items, className, ...props }) {
    return (
        <SidebarGroup {...props} className={cn('group-data-[collapsible=icon]:p-0', className)}>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100"
                            >
                                <a
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2"
                                >
                                    {item.icon && <item.icon className="h-5 w-5" />}
                                    <span>{item.title}</span>
                                    <ExternalLink className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
