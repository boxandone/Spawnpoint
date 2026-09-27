import type { BadgeFrameProps, BadgeTier } from '../../types';

const TIERS: Record<BadgeTier, { rim: string; face: string; ribbon: string }> = {
  locked: { rim: '#B8BFCC', face: '#E6E9EF', ribbon: '#C9CFD9' },
  bronze: { rim: '#B8733A', face: '#F2C79B', ribbon: '#D9824A' },
  silver: { rim: '#8E99A8', face: '#E8ECF2', ribbon: '#6F98F2' },
  gold: { rim: '#D39A1C', face: '#FFE39A', ribbon: '#F2A93B' },
};

/** Classic badge frame: a simple rounded medal on a short ribbon. */
export function BadgeFrame({ tier, children, size = 72, label }: BadgeFrameProps) {
  const c = TIERS[tier];
  return (
    <span
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size * 1.15 }}
      role="img"
      aria-label={label}
    >
      <svg
        viewBox="0 0 64 74"
        width={size}
        height={size * 1.15}
        aria-hidden
        className="absolute inset-0"
      >
        <path d="M20 2 L28 22 L22 26 L12 6 Z" fill={c.ribbon} />
        <path d="M44 2 L36 22 L42 26 L52 6 Z" fill={c.ribbon} opacity={0.85} />
        <circle cx="32" cy="44" r="27" fill={c.rim} />
        <circle cx="32" cy="44" r="22" fill={c.face} />
        <path
          d="M14 38 A20 20 0 0 1 44 22"
          stroke="#FFFFFF"
          strokeOpacity={0.6}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <span
        className="relative grid place-items-center"
        style={{
          marginTop: size * 0.3,
          width: size * 0.5,
          height: size * 0.5,
          color: '#2A3140',
          opacity: tier === 'locked' ? 0.45 : 1,
        }}
      >
        {children}
      </span>
    </span>
  );
}
