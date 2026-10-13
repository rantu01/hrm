'use client';

import { cn } from '@/lib/utils';

export function PageTemplate({ title, description, actions, children, noPadding = false, breadcrumbs }) {
    return (
        <div className="flex flex-1 flex-col gap-4 pt-4 pb-[10px] px-[10px] lg:pb-[50px] lg:px-[50px] print:p-0 print:gap-2">
            {/* Header with action buttons */}
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-xl font-semibold">{title}</h1>
                    {description && (
                        <div className="text-xs text-muted-foreground">{description}</div>
                    )}
                </div>
                {actions && actions.length > 0 && (
                    <div className="flex items-center gap-2">
                        {actions.map((action, index) => {
                            const hasLabel = action.label && action.label.trim() !== '';
                            const hasIcon = Boolean(action.icon);

                            return (
                                <button
                                    key={index}
                                    onClick={action.onClick}
                                    disabled={action.disabled}
                                    className={cn(
                                        'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                        'disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
                                        hasLabel ? 'h-8 px-3' : 'h-8 w-8',
                                        action.variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
                                        action.variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                                        action.variant === 'outline' && 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                                        action.variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                                        action.variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
                                        action.variant === 'link' && 'text-primary underline-offset-4 hover:underline',
                                        (!action.variant || action.variant === 'outline') && 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                                        action.className || ''
                                    )}
                                >
                                    {hasIcon && action.icon}
                                    {hasLabel && <span className="hidden md:inline ml-1.5">{action.label}</span>}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className={cn(!noPadding && 'rounded-xl border p-6 print:border-0 print:p-0')}>
                {children}
            </div>
        </div>
    );
}
