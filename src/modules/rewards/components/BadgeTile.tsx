import { Icon } from '@/components/ui';
import { BadgeFrame, useCopy, type CopyKey } from '@/theme';
import { frameTier, type BadgeInfo } from '../badges';

/** A badge in the active theme's frame, with its universal glyph and name. */
export function BadgeTile({
  info,
  tier,
  size = 64,
  onClick,
  compact,
}: {
  info: BadgeInfo;
  tier: number;
  size?: number;
  onClick?: () => void;
  /** Just the framed badge, no name underneath. */
  compact?: boolean;
}) {
  const t = useCopy();
  const frame = frameTier(tier, info.thresholds.length);
  const tierName = tier > 0 ? t(`badges.tier.${Math.min(tier, 4)}` as CopyKey) : '';
  const label = tier > 0 ? `${info.name}, ${tierName}` : info.name;
  const body = (
    <>
      <BadgeFrame tier={frame} size={size} label={label}>
        <Icon name={info.glyph} size={Math.round(size * 0.36)} strokeWidth={2.2} />
      </BadgeFrame>
      {!compact && (
        <span
          className={`line-clamp-2 text-center text-xs leading-tight ${tier > 0 ? 'font-bold' : 'text-ink-muted'}`}
        >
          {info.name}
        </span>
      )}
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-theme p-1"
    >
      {body}
    </button>
  ) : (
    <div className="flex flex-col items-center gap-1 p-1">{body}</div>
  );
}
