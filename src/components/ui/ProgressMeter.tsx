import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface ProgressMeterProps {
  value: number;
  max: number;
  label: string;
  /** Visible text next to the bar, e.g. "120 of 400". */
  valueText?: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'primary' | 'secondary' | 'success' | 'accent';
  className?: string;
  showLabel?: boolean;
}

const heights = { sm: 'h-2', md: 'h-3', lg: 'h-5' } as const;

/** Accessible progress bar that fills with the theme's color and texture. */
export const ProgressMeter = forwardRef<HTMLDivElement, ProgressMeterProps>(function ProgressMeter(
  { value, max, label, valueText, size = 'md', tone = 'primary', className, showLabel = true },
  ref,
) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div ref={ref} className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
          <span className="font-display">{label}</span>
          {valueText && <span className="font-num text-ink-muted">{valueText}</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(Math.min(value, max))}
        aria-valuetext={valueText}
        className={cn(
          'overflow-hidden rounded-full bg-surface-2 shadow-[inset_0_0_0_1px_var(--line)]',
          heights[size],
        )}
      >
        <div
          className="sp-meter-fill h-full rounded-full"
          style={{ width: `${pct}%`, ['--meter-fill' as string]: `var(--${tone})` }}
        />
      </div>
    </div>
  );
});
