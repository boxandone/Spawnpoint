import type { EffortIconProps } from '../../types';

/** Classic effort: one, two, or three dots. */
export function Effort({ level, className, title }: EffortIconProps) {
  return (
    <svg
      viewBox="0 0 30 10"
      width={30}
      height={10}
      className={className}
      role="img"
      aria-label={title ?? `Effort ${level} of 3`}
    >
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={5 + i * 10}
          cy={5}
          r={3.6}
          fill={i < level ? 'var(--primary)' : 'none'}
          stroke={i < level ? 'var(--primary)' : 'var(--ink-muted)'}
          strokeWidth={1.4}
          opacity={i < level ? 1 : 0.55}
        />
      ))}
    </svg>
  );
}
