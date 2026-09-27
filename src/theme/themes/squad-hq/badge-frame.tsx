import type { BadgeFrameProps, BadgeTier } from '../../types';

const TIERS: Record<BadgeTier, { plate: string; edge: string; stripes: number; strip: string }> = {
  locked: { plate: '#D7DEE8', edge: '#9AA6B8', stripes: 0, strip: '#9AA6B8' },
  bronze: { plate: '#F4C9A0', edge: '#B8682E', stripes: 1, strip: '#B8682E' },
  silver: { plate: '#E6ECF4', edge: '#7D8BA0', stripes: 2, strip: '#2F9BFF' },
  gold: { plate: '#FFE28A', edge: '#C98A10', stripes: 3, strip: '#FF8A2A' },
};

/** Squad HQ badge frame: an angled shield plate with a chevron rank strip. */
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
        <path
          d="M8 6 L50 6 L58 14 L58 44 C58 58 44 66 32 72 C20 66 6 58 6 44 L6 8 Z"
          fill={c.edge}
        />
        <path
          d="M11 10 L48 10 L54 16 L54 43 C54 55 42 62 32 67 C22 62 10 55 10 43 L10 11 Z"
          fill={c.plate}
        />
        <path d="M11 10 L48 10 L54 16 L20 16 Z" fill="#FFFFFF" opacity={0.5} />
        {Array.from({ length: c.stripes }).map((_, i) => (
          <path
            key={i}
            d={`M20 ${58 - i * 5} L32 ${52 - i * 5} L44 ${58 - i * 5}`}
            stroke={c.strip}
            strokeWidth={3}
            fill="none"
          />
        ))}
      </svg>
      <span
        className="relative grid place-items-center"
        style={{
          marginTop: -size * 0.12,
          width: size * 0.46,
          height: size * 0.46,
          color: '#1C2433',
          opacity: tier === 'locked' ? 0.45 : 1,
        }}
      >
        {children}
      </span>
    </span>
  );
}
