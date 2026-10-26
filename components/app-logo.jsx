'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

const LOGO_WIDTH = 320;
const LOGO_HEIGHT = 103;

export function AppIconMark({ className, size = 32, priority = false }) {
    return (
        <Image
            src="/Icon/icon.png"
            alt="LAMHA Tech"
            width={size}
            height={size}
            priority={priority}
            className={cn('object-contain', className)}
        />
    );
}

export function AppLogo({ className, imageClassName, compact = false, priority = false }) {
    if (compact) {
        return <AppIconMark size={32} priority={priority} className={cn('h-8 w-8', className)} />;
    }

    return (
        <span className={cn('inline-flex items-center', className)}>
            <Image
                src="/Icon/Full White@4x.png"
                alt="LAMHA Tech"
                width={LOGO_WIDTH}
                height={LOGO_HEIGHT}
                priority={priority}
                className={cn('h-7 w-auto object-contain dark:hidden', imageClassName)}
            />
            <Image
                src="/Icon/Full%20White%404x.png"
                alt="LAMHA Tech"
                width={LOGO_WIDTH}
                height={LOGO_HEIGHT}
                priority={priority}
                className={cn('hidden h-7 w-auto object-contain dark:block', imageClassName)}
            />
        </span>
    );
}

export default AppLogo;
