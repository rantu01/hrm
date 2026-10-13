'use client';

import { cn } from '@/lib/utils';

export function AppContent({ variant = 'header', children, className, ...props }) {
    if (variant === 'sidebar') {
        return (
            <main
                data-slot="sidebar-inset"
                className={cn(
                    'bg-background relative flex min-h-svh flex-1 flex-col',
                    'peer-data-[variant=inset]:min-h-[calc(100svh-(--spacing(4)))]',
                    'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0',
                    'md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm',
                    'md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0',
                    className
                )}
                style={{ overflowX: 'hidden' }}
                {...props}
            >
                <div dir="ltr">
                    {children}
                </div>
            </main>
        );
    }

    return (
        <main className={cn('mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-4 rounded-xl', className)} {...props}>
            <div dir="ltr">
                {children}
            </div>
        </main>
    );
}
