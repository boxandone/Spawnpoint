import type { EffortIconProps } from '../../types';

/** Squad HQ effort: one to three stacked chevrons, like rank stripes. */
export function Effort({ level, className, title }: EffortIconProps) {
  return (
    <svg
      viewBox="0 0 16 22"
      width={14}
      height={20}
      className={className}
      role="img"
      aria-label={title ?? `Effort ${level} of 3`}
    >
      {[0, 1, 2].map((i) => {
        const on = i < level;
        const y = 16 - i * 6;
        return (
          <path
            key={i}
            d={`M2 ${y} L8 ${y - 5} L14 ${y}`}
            fill="none"
            stroke={on ? 'var(--primary)' : 'var(--ink-muted)'}
            strokeOpacity={on ? 1 : 0.35}
            strokeWidth={3}
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        );
      })}
    </svg>
  );
}
