import type { HeroArtProps } from '../../types';

/** Classic: soft, overlapping rounded shapes in the theme's own colors. */
export function Hero({ variant, className }: HeroArtProps) {
  const tall = variant === 'today';
  return (
    <svg
      viewBox={tall ? '0 0 360 180' : '0 0 360 96'}
      preserveAspectRatio="xMaxYMid slice"
      className={className}
      aria-hidden
      focusable="false"
    >
      <g opacity="0.22">
        <circle cx="300" cy={tall ? 40 : 18} r={tall ? 70 : 46} fill="var(--primary)" />
        <circle cx="352" cy={tall ? 140 : 84} r={tall ? 60 : 38} fill="var(--secondary)" />
        <circle cx="230" cy={tall ? 150 : 90} r={tall ? 34 : 22} fill="var(--accent)" />
        {tall && <circle cx="170" cy="-10" r="30" fill="var(--secondary)" />}
      </g>
    </svg>
  );
}
