import type { HeroArtProps } from '../../types';

/**
 * Squad HQ: a pre-match lobby banner. Angled panels, rank chevrons, and a
 * soft glow, drawn from simple shapes in the theme's colors.
 */
export function Hero({ variant, className }: HeroArtProps) {
  const tall = variant === 'today';
  const h = tall ? 180 : 96;
  return (
    <svg
      viewBox={`0 0 360 ${h}`}
      preserveAspectRatio="xMaxYMid slice"
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <radialGradient id="sq-glow" cx="80%" cy="30%" r="60%">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        <pattern
          id="sq-stripes"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-30)"
        >
          <rect width="4" height="12" fill="var(--secondary)" opacity="0.18" />
        </pattern>
      </defs>
      <rect width="360" height={h} fill="url(#sq-glow)" />
      <path d={`M200 0h160v${h}H250Z`} fill="url(#sq-stripes)" />
      <path d={`M300 0h60v${h}h-110Z`} fill="var(--secondary)" opacity="0.14" />
      <g fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinejoin="miter" opacity="0.45">
        <path d={`M318 ${tall ? 70 : 34}l14 -12 14 12`} />
        <path d={`M318 ${tall ? 88 : 50}l14 -12 14 12`} />
        {tall && <path d="M318 106l14 -12 14 12" />}
      </g>
      <path
        d={`M232 ${h}l30 -${tall ? 60 : 34}h40l-30 ${tall ? 60 : 34}Z`}
        fill="var(--accent)"
        opacity="0.3"
      />
    </svg>
  );
}
