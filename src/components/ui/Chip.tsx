import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  children: ReactNode;
  leading?: ReactNode;
}

/** A toggle chip. Announces its state with aria-pressed. */
export function Chip({ selected = false, className, children, leading, type, ...rest }: ChipProps) {
  return (
    <button
      type={type ?? 'button'}
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors',
        selected
          ? 'bg-primary text-primary-ink shadow-press'
          : 'bg-surface text-ink shadow-[inset_0_0_0_2px_var(--line)] hover:bg-surface-2',
        className,
      )}
      {...rest}
    >
      {leading}
      {children}
    </button>
  );
}

/** A non-interactive label, like "This month" or "Waiting since Mon". */
export function Tag({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'secondary' | 'success' | 'warning';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-surface-2 text-ink-muted',
    accent: 'bg-accent text-on-accent',
    secondary: 'bg-secondary text-on-secondary',
    success: 'bg-success text-on-success',
    warning: 'bg-warning text-on-warning',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
