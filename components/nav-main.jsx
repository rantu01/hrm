'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from './app-sidebar';

const STORAGE_KEY = 'nav_expanded_items';

export function NavMain({ items = [], searchQuery = '' }) {
    const pathname = usePathname();

    const [expandedItems, setExpandedItems] = useState({});

    useEffect(() => {
        const newExpandedItems = {};

        const processMenuItems = (menuItems, parentKey) => {
            menuItems.forEach((item) => {
                const isItemActive = isActive(item.href);
                const hasActiveChild = item.children && isChildActive(item.children);

                if (parentKey && (isItemActive || hasActiveChild)) {
                    newExpandedItems[parentKey] = true;
                }

                if (item.children && (isItemActive || hasActiveChild || item.defaultOpen === true)) {
                    newExpandedItems[item.title] = true;
                    processMenuItems(item.children, item.title);
                }

                if (item.children) {
                    checkNestedChildren(item.children, 1, newExpandedItems);
                }
            });
        };

        processMenuItems(items, null);

        setExpandedItems(newExpandedItems);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newExpandedItems));
        } catch (e) {
            // ignore
        }
    }, [pathname, items]);

    const checkNestedChildren = (children, level, newExpandedItems) => {
        children.forEach((child) => {
            const childKey = `${level}-${child.title}`;
            const isChildItemActive = isActive(child.href);
            const hasActiveChild = child.children && isChildActive(child.children);

            if (child.children && (isChildItemActive || hasActiveChild)) {
                newExpandedItems[childKey] = true;
                checkNestedChildren(child.children, level + 1, newExpandedItems);
            }
        });
    };

    const toggleExpand = (title) => {
        const newExpandedItems = {
            ...expandedItems,
            [title]: !expandedItems[title],
        };

        setExpandedItems(newExpandedItems);

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newExpandedItems));
        } catch (e) {
            // ignore
        }
    };

    const isActive = (href) => {
        if (!href) return false;

        const hrefPath = href.startsWith('http') ? new URL(href).pathname : href;
        const normalizedHref = hrefPath.replace(/\/$/, '');
        const normalizedCurrent = pathname.replace(/\/$/, '');

        if (normalizedCurrent === normalizedHref) return true;
        if (normalizedCurrent.startsWith(normalizedHref + '/')) return true;

        return false;
    };

    const isChildActive = (children) => {
        if (!children) return false;
        return children.some((child) => isActive(child.href) || isChildActive(child.children));
    };

    const renderSubMenu = (children, level = 1) => {
        return (
            <SidebarMenuSub>
                {children.map((child) => (
                    <div key={child.title}>
                        {child.children ? (
                            <>
                                <SidebarMenuSubItem>
                                    <SidebarMenuSubButton
                                        isActive={isChildActive(child.children)}
                                        onClick={() => toggleExpand(`${level}-${child.title}`)}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{child.title}</span>
                                            {expandedItems[`${level}-${child.title}`] ? (
                                                <ChevronDown className="ml-auto h-3 w-3" />
                                            ) : (
                                                <ChevronRight className="ml-auto h-3 w-3" />
                                            )}
                                        </div>
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                {expandedItems[`${level}-${child.title}`] && renderSubMenu(child.children, level + 1)}
                            </>
                        ) : (
                            <SidebarMenuSubItem>
                                <SidebarMenuSubButton asChild isActive={isActive(child.href)}>
                                    {child.target === '_blank' ? (
                                        <a
                                            href={child.href || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex w-full flex-1 min-w-0 items-center gap-2"
                                        >
                                            <span className="truncate">{child.title}</span>
                                        </a>
                                    ) : (
                                        <Link href={child.href || '#'} className="flex w-full flex-1 min-w-0 items-center gap-2">
                                            <span className="truncate">{child.title}</span>
                                        </Link>
                                    )}
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        )}
                    </div>
                ))}
            </SidebarMenuSub>
        );
    };

    if (searchQuery && items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <Search className="mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No menu found</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">&quot;{searchQuery}&quot;</p>
            </div>
        );
    }

    const groups = [];
    let currentGroup = null;

    items.forEach((item) => {
        const groupLabel = item.group || null;
        if (!currentGroup || currentGroup.label !== groupLabel) {
            currentGroup = { label: groupLabel, items: [] };
            groups.push(currentGroup);
        }
        currentGroup.items.push(item);
    });

    return (
        <>
            {groups.map((group, groupIndex) => (
                <SidebarGroup key={groupIndex} className={cn('px-1.5 py-0', groupIndex > 0 && 'mt-3')}>
                    {group.label && (
                        <SidebarGroupLabel className="flex w-full px-2 pt-2 pb-1.5">
                            <span className="text-[13px] font-bold capitalize tracking-wide text-gray-500 dark:text-gray-400 leading-none">
                                {group.label}
                            </span>
                        </SidebarGroupLabel>
                    )}
                    <SidebarMenu>
                        {group.items.map((item) => (
                            <div key={item.title}>
                                {item.children ? (
                                    <>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                isActive={isChildActive(item.children)}
                                                onClick={() => toggleExpand(item.title)}
                                                className="cursor-pointer"
                                            >
                                                <div className="flex w-full min-w-0 items-center gap-2">
                                                    {item.icon && <item.icon className="h-4 w-4 flex-shrink-0" />}
                                                    <div className="flex min-w-0 flex-1 items-center gap-1">
                                                        <span className="truncate">{item.title}</span>
                                                        {item.badge && (
                                                            <span className="flex-shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-white">
                                                                {item.badge.label}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {expandedItems[item.title] ? (
                                                        <ChevronDown className="ml-auto h-3 w-3 flex-shrink-0" />
                                                    ) : (
                                                        <ChevronRight className="ml-auto h-3 w-3 flex-shrink-0" />
                                                    )}
                                                </div>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                        {expandedItems[item.title] && renderSubMenu(item.children)}
                                    </>
                                ) : (
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.title}>
                                            {item.target === '_blank' ? (
                                                <a
                                                    href={item.href || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex w-full flex-1 min-w-0 items-center gap-2"
                                                >
                                                    {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                                                    <span className="truncate">{item.title}</span>
                                                </a>
                                            ) : (
                                                <Link href={item.href || '#'} className="flex w-full flex-1 min-w-0 items-center gap-2">
                                                    {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                                                    <span className="truncate">{item.title}</span>
                                                </Link>
                                            )}
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )}
                            </div>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </>
    );
}
