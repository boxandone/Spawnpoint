/** The Spawnpoint mark: a little house on a glowing start ring. Original art. */
export function Logo({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <ellipse cx="32" cy="54" rx="24" ry="6" fill="var(--accent)" opacity="0.45" />
      <ellipse cx="32" cy="54" rx="15" ry="3.6" fill="var(--accent)" />
      <path d="M14 30 L32 14 L50 30 L50 50 L14 50 Z" fill="var(--primary)" />
      <path
        d="M10 31 L32 11 L54 31"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="27" y="36" width="10" height="14" rx="3" fill="var(--surface)" />
      <path
        d="M44 6 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6 Z"
        fill="var(--accent)"
      />
    </svg>
  );
}
