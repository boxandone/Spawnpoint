import { getAvatar } from '@/theme';
import { MEMBER_INK, memberColor } from '@/theme/memberColors';
import { cn } from '@/lib/cn';

interface AvatarProps {
  avatar?: string | null;
  color?: string | null;
  name: string;
  size?: number;
  className?: string;
  /** Show a ring, e.g. for the selected member in a picker. */
  ring?: boolean;
  decorative?: boolean;
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  );
}

/** A member's avatar on their chosen color. Falls back to initials. */
export function Avatar({
  avatar,
  color,
  name,
  size = 40,
  className,
  ring,
  decorative,
}: AvatarProps) {
  const def = getAvatar(avatar);
  return (
    <span
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full',
        ring && 'ring-[3px] ring-primary ring-offset-2 ring-offset-bg',
        className,
      )}
      style={{ width: size, height: size, background: memberColor(color), color: MEMBER_INK }}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
    >
      {def ? (
        <img src={def.src} alt="" className="h-[88%] w-[88%] translate-y-[6%]" draggable={false} />
      ) : (
        <span className="font-display font-extrabold" style={{ fontSize: size * 0.4 }}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}
