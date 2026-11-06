import { cn } from '@/lib/utils';

/**
 * Bangladeshi Taka mark (৳) used in place of a dollar icon wherever payroll
 * amounts are shown. Rendered as text so it stays crisp at every size and
 * inherits the surrounding colour.
 */
export function TakaIcon({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-semibold leading-none',
        className
      )}
    >
      ৳
    </span>
  );
}
