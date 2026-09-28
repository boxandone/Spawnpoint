import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Icon, ProgressMeter, ProgressRing, useToast } from '@/components/ui';
import { useHousehold } from '@/modules/households/context';
import { ALL_BADGES } from '@/modules/rewards/badges';
import { BadgeTile } from '@/modules/rewards/components/BadgeTile';
import { useMyBadges, useMyRewards } from '@/modules/rewards/hooks';
import { drawShareCard, shareOrDownload } from '@/modules/rewards/shareCard';
import { levelTitle, useCopy, usePack, type CopyKey } from '@/theme';
import { memberColor } from '@/theme/memberColors';
import { getAvatar } from '@/theme/registry';

/** Level, coins, active weeks, season, and top badges. Only ever shown to their owner. */
export function RewardsPanel() {
  const t = useCopy();
  const pack = usePack();
  const { data: r } = useMyRewards();
  const { data: badges } = useMyBadges();
  const { member } = useHousehold();
  const toast = useToast();
  const [sharing, setSharing] = useState(false);
  if (!r) return null;

  const span = r.level_next - r.level_start;
  const into = r.xp_total - r.level_start;
  const earned = (badges ?? [])
    .filter((b) => b.tier > 0)
    .sort(
      (a, b) => b.tier - a.tier || (b.tier_earned_at ?? '').localeCompare(a.tier_earned_at ?? ''),
    );
  const quarter = r.season.key.split('-')[1] as 'Q1' | 'Q2' | 'Q3' | 'Q4';
  const levelLine = t('level.label', {
    level: r.level,
    title: levelTitle(pack.levelTitles, r.level),
  });

  async function shareCard() {
    setSharing(true);
    try {
      const blob = await drawShareCard({
        name: member.display_name,
        levelLine,
        badgeLine: t('rewards.shareBadges', { count: earned.length }),
        topBadges: earned.slice(0, 3).flatMap((b) => {
          const info = ALL_BADGES.find((x) => x.key === b.badge_key);
          return info
            ? [{ name: info.name, tier: t(`badges.tier.${Math.min(b.tier, 4)}` as CopyKey) }]
            : [];
        }),
        themeName: pack.name,
        appName: t('app.name'),
        avatarSrc: getAvatar(member.avatar)?.src,
        avatarColor: memberColor(member.color),
      });
      if (!blob) throw new Error('no canvas');
      const how = await shareOrDownload(blob, 'spawnpoint-card.png');
      if (how === 'downloaded') toast.show({ message: t('rewards.shareSaved') });
    } catch {
      toast.show({ message: t('rewards.shareFailed') });
    } finally {
      setSharing(false);
    }
  }

  return (
    <section className="sp-panel mt-4 flex flex-col gap-4 p-4" aria-label={t('rewards.title')}>
      <div className="flex items-center gap-4">
        <ProgressRing
          value={into}
          max={span}
          size={84}
          stroke={9}
          label={levelLine}
          valueText={t('rewards.progress', { into, span, next: r.level + 1 })}
        >
          <span className="leading-none">
            <span className="block text-[10px] font-bold uppercase text-ink-muted">
              {t('rewards.lv')}
            </span>
            <span className="font-num text-2xl font-bold">{r.level}</span>
          </span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl leading-tight">
            {levelTitle(pack.levelTitles, r.level)}
          </p>
          <p className="text-sm text-ink-muted">
            {t('rewards.toNext', { count: span - into, next: r.level + 1 })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              to="/me/shop"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-accent px-3 text-sm font-bold text-on-accent"
            >
              <Icon name="coin" size={16} />
              {r.coins.toLocaleString()} {t('coins.name')}
            </Link>
            <span className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-surface-2 px-3 text-sm font-bold">
              <Icon name="calendar" size={16} />
              {t('rewards.weeksShort', { count: r.active_weeks })}
            </span>
          </div>
        </div>
      </div>

      <Link to="/me/badges" className="flex items-center gap-3 rounded-theme bg-surface-2 p-3">
        <span className="min-w-0 flex-1">
          <span className="block font-bold">
            {t('badge.plural')} · {earned.length}
          </span>
          {earned.length === 0 && (
            <span className="block text-sm text-ink-muted">{t('badges.none')}</span>
          )}
        </span>
        <span className="flex -space-x-2">
          {earned.slice(0, 3).map((b) => {
            const info = ALL_BADGES.find((x) => x.key === b.badge_key);
            return info ? (
              <span key={b.badge_key} className="pointer-events-none">
                <BadgeTile info={info} tier={b.tier} size={40} compact />
              </span>
            ) : null;
          })}
        </span>
        <Icon name="chevron" size={18} className="text-ink-muted" />
      </Link>

      <Link to="/me/season" className="flex flex-col gap-2 rounded-theme bg-surface-2 p-3">
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 font-bold">
            {t('season.title', { season: t(`season.${quarter}` as CopyKey) })}
          </span>
          <span className="font-num text-sm text-ink-muted">{r.season.done}/10</span>
          <Icon name="chevron" size={18} className="text-ink-muted" />
        </span>
        <ProgressMeter
          label={t('season.title', { season: t(`season.${quarter}` as CopyKey) })}
          showLabel={false}
          value={r.season.done}
          max={10}
          valueText={t('season.body', { done: r.season.done })}
          tone={r.season.done >= 5 ? 'success' : 'secondary'}
        />
      </Link>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-ink-muted">
          {t('rewards.private', { coinsName: t('coins.name') })}
        </p>
        <Button
          size="sm"
          variant="ghost"
          icon="gift"
          className="shrink-0 whitespace-nowrap"
          onClick={() => void shareCard()}
          disabled={sharing}
        >
          {t('rewards.shareCard')}
        </Button>
      </div>
    </section>
  );
}
