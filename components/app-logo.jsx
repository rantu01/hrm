'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

export function AppIconMark({ className, size = 32 }) {
    return (
        <Image
            src="/Icon/Asset%202%404x.png"
            alt="HRM logo icon"
            width={size}
            height={size}
            priority
            className={cn('object-contain', className)}
        />
    );
}

export function AppLogo({ className, compact = false }) {
    return (
        <div className={cn('flex items-center', className)}>
            <AppIconMark size={compact ? 28 : 32} className={compact ? 'h-7 w-7' : 'h-8 w-8'} />

            {!compact && (
                <Image
                    src="/Icon/Full%20Black%404x.png"
                    alt="HRM SaaS logo"
                    width={128}
                    height={32}
                    priority
                    className="ml-2 h-7 w-auto object-contain dark:invert"
                />
            )}
        </div>
    );
}

export default AppLogo;
