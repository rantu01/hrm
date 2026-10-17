'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutGrid,
    Briefcase,
    Users,
    CalendarDays,
    Clock,
    DollarSign,
    Settings,
    ChevronDown,
    ChevronRight,
    Building2,
    Calendar,
    Folder,
    FileText,
    Image,
    Gift,
    Palette,
    CreditCard,
    BarChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppLogo } from './app-logo';
import { NavMain } from './nav-main';
import { NavUser } from './nav-user';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = '18rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '3rem';

const SidebarContext = createContext(null);

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider.');
    }
    return context;
}

export function SidebarProvider({ defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children }) {
    const [isMobile, setIsMobile] = useState(false);
    const [openMobile, setOpenMobile] = useState(false);
    const [_open, _setOpen] = useState(defaultOpen);
    const open = openProp ?? _open;

    const setOpen = useCallback(
        (value) => {
            const openState = typeof value === 'function' ? value(open) : value;
            if (setOpenProp) {
                setOpenProp(openState);
            } else {
                _setOpen(openState);
            }
            if (typeof document !== 'undefined') {
                document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
            }
        },
        [setOpenProp, open]
    );

    const toggleSidebar = useCallback(() => {
        return isMobile ? setOpenMobile((o) => !o) : setOpen((o) => !o);
    }, [isMobile, setOpen, setOpenMobile]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'b' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                toggleSidebar();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleSidebar]);

    const state = open ? 'expanded' : 'collapsed';

    const contextValue = {
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
    };

    return (
        <SidebarContext.Provider value={contextValue}>
            <div
                data-slot="sidebar-wrapper"
                style={{
                    '--sidebar-width': SIDEBAR_WIDTH,
                    '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
                    ...style,
                }}
                className={cn(
                    'group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full',
                    className
                )}
            >
                {children}
            </div>
        </SidebarContext.Provider>
    );
}

export function Sidebar({ side = 'left', variant = 'sidebar', collapsible = 'offcanvas', className, children, style }) {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    if (collapsible === 'none') {
        return (
            <div
                data-slot="sidebar"
                className={cn('bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col', className)}
                style={style}
            >
                {children}
            </div>
        );
    }

    if (isMobile) {
        return (
            <>
                {openMobile && (
                    <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setOpenMobile(false)} />
                )}
                <div
                    className={cn(
                        'bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-50 flex w-(--sidebar-width) flex-column transition-transform duration-200',
                        openMobile ? 'translate-x-0' : '-translate-x-full'
                    )}
                    style={{ '--sidebar-width': SIDEBAR_WIDTH_MOBILE }}
                >
                    <div className="flex h-full w-full flex-col">{children}</div>
                </div>
            </>
        );
    }

    return (
        <div
            className="group peer text-sidebar-foreground hidden md:block print:hidden"
            data-state={state}
            data-collapsible={state === 'collapsed' ? collapsible : ''}
            data-variant={variant}
            data-side={side}
            data-slot="sidebar"
        >
            <div
                className={cn(
                    'relative h-svh w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
                    'group-data-[collapsible=offcanvas]:w-0',
                    'group-data-[side=right]:rotate-180',
                    variant === 'floating' || variant === 'inset'
                        ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
                        : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)'
                )}
            />
            <div
                className={cn(
                    'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex',
                    side === 'left'
                        ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
                        : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
                    variant === 'floating' || variant === 'inset'
                        ? 'px-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
                        : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l'
                )}
            >
                <div
                    data-sidebar="sidebar"
                    className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
                    style={style}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

export function SidebarTrigger({ className, onClick }) {
    const { toggleSidebar } = useSidebar();

    return (
        <button
            data-sidebar="trigger"
            data-slot="sidebar-trigger"
            className={cn('flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent cursor-pointer', className)}
            onClick={(event) => {
                onClick?.(event);
                toggleSidebar();
            }}
        >
            <LayoutGrid className="h-4 w-4" />
            <span className="sr-only">Toggle Sidebar</span>
        </button>
    );
}

export function SidebarInset({ className, children, ...props }) {
    return (
        <main
            data-slot="sidebar-inset"
            className={cn(
                'bg-background relative flex min-h-svh flex-1 flex-col',
                'peer-data-[variant=inset]:min-h-[calc(100svh-(--spacing(4)))] md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0',
                className
            )}
            {...props}
        >
            {children}
        </main>
    );
}

export function SidebarHeader({ className, children, ...props }) {
    return (
        <div
            data-slot="sidebar-header"
            data-sidebar="header"
            className={cn('flex flex-col gap-2 p-2', className)}
            {...props}
        >
            {children}
        </div>
    );
}

export function SidebarFooter({ className, children, ...props }) {
    return (
        <div
            data-slot="sidebar-footer"
            data-sidebar="footer"
            className={cn('flex flex-col gap-2 p-2', className)}
            {...props}
        >
            {children}
        </div>
    );
}

export function SidebarContent({ className, children, ...props }) {
    return (
        <div
            data-slot="sidebar-content"
            data-sidebar="content"
            className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden', className)}
            {...props}
        >
            {children}
        </div>
    );
}

export function SidebarGroup({ className, children, ...props }) {
    return (
        <div
            data-slot="sidebar-group"
            data-sidebar="group"
            className={cn('relative flex w-full min-w-0 flex-col p-2', className)}
            {...props}
        >
            {children}
        </div>
    );
}

export function SidebarGroupLabel({ className, children, ...props }) {
    return (
        <div
            data-slot="sidebar-group-label"
            data-sidebar="group-label"
            className={cn(
                'text-sidebar-foreground/70 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium transition-[margin,opacity] duration-200 ease-linear',
                'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function SidebarGroupContent({ className, children, ...props }) {
    return (
        <div
            data-slot="sidebar-group-content"
            data-sidebar="group-content"
            className={cn('w-full text-sm', className)}
            {...props}
        >
            {children}
        </div>
    );
}

export function SidebarMenu({ className, children, ...props }) {
    return (
        <ul
            data-slot="sidebar-menu"
            data-sidebar="menu"
            className={cn('flex w-full min-w-0 flex-col gap-1', className)}
            {...props}
        >
            {children}
        </ul>
    );
}

export function SidebarMenuItem({ className, children, ...props }) {
    return (
        <li
            data-slot="sidebar-menu-item"
            data-sidebar="menu-item"
            className={cn('group/menu-item relative', className)}
            {...props}
        >
            {children}
        </li>
    );
}

const sidebarMenuButtonVariants = {
    default: 'hover:bg-sidebar-accent hover:text-primary active:text-primary',
    outline: 'bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent)))]',
};

export function SidebarMenuButton({ asChild = false, isActive = false, variant = 'default', size = 'default', tooltip, className, children, ...props }) {
    const Comp = asChild ? 'span' : 'button';
    const { state } = useSidebar();

    const button = (
        <Comp
            data-slot="sidebar-menu-button"
            data-sidebar="menu-button"
            data-size={size}
            data-active={isActive}
            className={cn(
                'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
                'group-has-data-[sidebar=menu-action]/menu-item:pr-8',
                'data-[active=true]:bg-transparent data-[active=true]:text-primary data-[active=true]:font-semibold',
                'data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground',
                'group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2',
                '[&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
                // When rendering asChild (span wrapping a Link), make the inner link
                // fill the entire button so clicking anywhere navigates.
                asChild && '[&>a]:flex [&>a]:w-full [&>a]:flex-1 [&>a]:min-w-0 [&>a]:items-center [&>a]:gap-2',
                sidebarMenuButtonVariants[variant] || sidebarMenuButtonVariants.default,
                size === 'sm' && 'h-7 text-xs',
                size === 'default' && 'h-8 text-sm',
                size === 'lg' && 'h-12 text-sm group-data-[collapsible=icon]:p-0',
                className
            )}
            {...props}
        >
            {children}
        </Comp>
    );

    if (!tooltip) return button;

    return (
        <div className="relative group/tooltip">
            {button}
            <div className="hidden group-hover/tooltip:block absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-xs bg-foreground text-background rounded-md whitespace-nowrap z-50">
                {typeof tooltip === 'string' ? tooltip : tooltip.children}
            </div>
        </div>
    );
}

export function SidebarMenuSub({ className, children, ...props }) {
    return (
        <ul
            data-slot="sidebar-menu-sub"
            data-sidebar="menu-sub"
            className={cn(
                'border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5',
                'group-data-[collapsible=icon]:hidden',
                className
            )}
            {...props}
        >
            {children}
        </ul>
    );
}

export function SidebarMenuSubItem({ className, children, ...props }) {
    return (
        <li
            data-slot="sidebar-menu-sub-item"
            data-sidebar="menu-sub-item"
            className={cn(
                'group/menu-sub-item relative',
                '[&:has([data-active=true])]:before:absolute [&:has([data-active=true])]:before:left-[-11px] [&:has([data-active=true])]:before:top-0 [&:has([data-active=true])]:before:h-full [&:has([data-active=true])]:before:w-[2px] [&:has([data-active=true])]:before:bg-primary [&:has([data-active=true])]:before:rounded-full',
                className
            )}
            {...props}
        >
            {children}
        </li>
    );
}

export function SidebarMenuSubButton({ asChild = false, size = 'md', isActive = false, className, children, ...props }) {
    const Comp = asChild ? 'span' : 'a';

    return (
        <Comp
            data-slot="sidebar-menu-sub-button"
            data-sidebar="menu-sub-button"
            data-size={size}
            data-active={isActive}
            className={cn(
                'text-sidebar-foreground flex h-7 min-w-0 w-full -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 hover:bg-sidebar-accent hover:text-primary active:bg-sidebar-accent active:text-primary focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&>svg]:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
                'data-[active=true]:bg-transparent data-[active=true]:text-primary data-[active=true]:font-semibold',
                // When rendering asChild (span wrapping a Link), make the inner link
                // fill the entire row so clicking anywhere navigates.
                asChild && '[&>a]:flex [&>a]:w-full [&>a]:flex-1 [&>a]:min-w-0 [&>a]:items-center [&>a]:gap-2',
                size === 'sm' && 'text-xs',
                size === 'md' && 'text-sm',
                'group-data-[collapsible=icon]:hidden',
                className
            )}
            {...props}
        >
            {children}
        </Comp>
    );
}

export function SidebarSeparator({ className, children, ...props }) {
    return (
        <div
            data-slot="sidebar-separator"
            data-sidebar="separator"
            className={cn('bg-sidebar-border mx-2 w-auto', className)}
            {...props}
        >
            {children}
        </div>
    );
}

const mainNavItems = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'HR Management',
        icon: Briefcase,
        children: [
            { title: 'Branches', href: '/hr/branches' },
            { title: 'Departments', href: '/hr/departments' },
            { title: 'Designations', href: '/hr/designations' },
            { title: 'Employees', href: '/hr/employees' },
            {
                title: 'Performance',
                children: [
                    { title: 'Indicator Categories', href: '/hr/performance/indicator-categories' },
                    { title: 'Indicators', href: '/hr/performance/indicators' },
                    { title: 'Goal Types', href: '/hr/performance/goal-types' },
                    { title: 'Employee Goals', href: '/hr/performance/employee-goals' },
                    { title: 'Review Cycles', href: '/hr/performance/review-cycles' },
                    { title: 'Employee Reviews', href: '/hr/performance/employee-reviews' },
                ],
            },
            { title: 'Holidays', href: '/hr/holidays' },
            { title: 'Announcements', href: '/hr/announcements' },
        ],
    },
        {
            title: 'Staff',
            icon: Users,
            children: [
                { title: 'Users', href: '/staff/users' },
                { title: 'Roles', href: '/staff/roles' },
            ],
        },
    {
        title: 'Recruitment',
        icon: Users,
        children: [
            { title: 'Job Postings', href: '/recruitment/job-postings' },
            { title: 'Candidates', href: '/recruitment/candidates' },
            { title: 'Interviews', href: '/recruitment/interviews' },
        ],
    },
    {
        title: 'Leave Management',
        icon: CalendarDays,
        children: [
            { title: 'Leave Types', href: '/leave/types' },
            { title: 'Leave Applications', href: '/leave/applications' },
        ],
    },
    {
        title: 'Attendance',
        icon: Clock,
        children: [
            { title: 'Shifts', href: '/attendance/shifts' },
            { title: 'Attendance Records', href: '/attendance/records' },
        ],
    },
    {
        title: 'Payroll Management',
        icon: DollarSign,
        children: [
            { title: 'Salary Components', href: '/payroll/salary-components' },
            { title: 'Employee Salaries', href: '/payroll/employee-salaries' },
            { title: 'Payroll Runs', href: '/payroll/runs' },
            { title: 'Payslips', href: '/payroll/payslips' },
        ],
    },
    {
        title: 'Meetings',
        icon: Calendar,
        children: [
            { title: 'Meeting Types', href: '/meetings/types' },
            { title: 'Meetings', href: '/meetings/list' },
        ],
    },
    { title: 'Calendar', href: '/calendar', icon: Calendar },
    {
        title: 'Document Management',
        icon: Folder,
        children: [
            { title: 'Document Categories', href: '/documents/categories' },
            { title: 'HR Documents', href: '/documents/hr-documents' },
        ],
    },
    { title: 'Media Library', href: '/media-library', icon: Image },
    {
        title: 'Contract Management',
        icon: FileText,
        children: [
            { title: 'Contract Types', href: '/contracts/types' },
            { title: 'Employee Contracts', href: '/contracts/employee-contracts' },
        ],
    },
    { title: 'Settings', href: '/settings', icon: Settings },
];

const footerNavItems = [
    { title: 'Documentation', href: '/docs' },
    { title: 'Support', href: '/support' },
];

export function AppSidebar({ variant = 'sidebar', collapsible = 'offcanvas' }) {
    return (
        <Sidebar variant={variant} collapsible={collapsible}>
            <SidebarHeader>
                <div className="flex justify-center items-center p-2">
                    <Link href="/dashboard" className="flex items-center justify-center">
                        <div className="group-data-[collapsible=icon]:hidden flex items-center">
                            <AppLogo />
                        </div>
                        <div className="h-8 w-8 hidden group-data-[collapsible=icon]:block">
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-sm font-bold text-white shadow-sm">
                                W
                            </div>
                        </div>
                    </Link>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
