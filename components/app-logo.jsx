'use client';

import { Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppLogo({ className }) {
    return (
        <div className={cn('flex items-center', className)}>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-md">
                <Briefcase className="size-5 text-white dark:text-black" />
            </div>
            <div className="ml-1 grid flex-1 truncate text-sm leading-none font-semibold">
                WorkDo
            </div>
        </div>
    );
}

export default AppLogo;
