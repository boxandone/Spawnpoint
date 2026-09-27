import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Icon, Panel, ProgressMeter, SectionTitle, useToast } from '@/components/ui';
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
    <>
      <Panel className="mt-4 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-2xl">
            {t('level.label', { level: r.level, title: levelTitle(pack.levelTitles, r.level) })}
          </p>
          <p className="font-num text-sm text-ink-muted">
            {t('rewards.totalXp', { xp: r.xp_total.toLocaleString() })}
          </p>
        </div>
        <ProgressMeter
          label={t('level.label', { level: r.level, title: levelTitle(pack.levelTitles, r.level) })}
          showLabel={false}
          value={into}
          max={span}
          valueText={t('rewards.progress', { into, span, next: r.level + 1 })}
          size="lg"
        />
        <p className="text-sm text-ink-muted">
          {t('rewards.progress', { into, span, next: r.level + 1 })}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/me/shop" className="flex items-center gap-2 rounded-theme bg-surface-2 p-3">
            <Icon name="coin" size={22} />
            <span className="min-w-0">
              <span className="block font-num text-lg font-bold">{r.coins.toLocaleString()}</span>
              <span className="block truncate text-xs text-ink-muted">
                {t('coins.name')} · {t('shop.name')}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2 rounded-theme bg-surface-2 p-3">
            <Icon name="calendar" size={22} />
            <span className="min-w-0">
              <span className="block font-num text-lg font-bold">{r.active_weeks}</span>
              <span className="block truncate text-xs text-ink-muted">{t('streak.name')}</span>
            </span>
          </div>
        </div>
        <p className="text-sm text-ink-muted">
          {r.current_run > 0 ? t('rewards.run', { count: r.current_run }) : t('rewards.runNone')}
        </p>
        <p className="text-xs text-ink-muted">
          {t('rewards.private', { coinsName: t('coins.name') })}
        </p>
        <Button variant="secondary" onClick={() => void shareCard()} disabled={sharing}>
          {t('rewards.shareCard')}
        </Button>
      </Panel>

      <SectionTitle
        action={
          <Link to="/me/badges" className="text-sm font-bold underline underline-offset-2">
            {t('rewards.seeAll')}
          </Link>
        }
      >
        {t('badge.plural')} · {earned.length}
      </SectionTitle>
      <Panel>
        {earned.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('badges.none')}</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {earned.slice(0, 4).map((b) => {
              const info = ALL_BADGES.find((x) => x.key === b.badge_key);
              return info ? (
                <BadgeTile key={b.badge_key} info={info} tier={b.tier} size={56} />
              ) : null;
            })}
          </div>
        )}
      </Panel>

      <SectionTitle>
        {t('season.title', { season: t(`season.${quarter}` as CopyKey) })}
      </SectionTitle>
      <Panel className="flex flex-col gap-3">
        <ProgressMeter
          label={t('season.title', { season: t(`season.${quarter}` as CopyKey) })}
          value={r.season.done}
          max={10}
          valueText={t('season.body', { done: r.season.done })}
          tone={r.season.done >= 5 ? 'success' : 'secondary'}
        />
        <ul className="flex flex-col gap-2">
          {r.season.goals.map((g) => {
            const done = g.progress >= g.target;
            return (
              <li key={g.key} className="flex items-center gap-2 text-sm">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${done ? 'bg-success text-on-success' : 'shadow-[inset_0_0_0_2px_var(--line)]'}`}
                  aria-hidden
                >
                  {done && <Icon name="check" size={14} strokeWidth={3} />}
                </span>
                <span className={`flex-1 ${done ? 'font-bold' : ''}`}>
                  {t(`goal.${g.key}` as CopyKey)}
                </span>
                <span className="font-num text-ink-muted">
                  {Math.min(Math.floor(g.progress), g.target).toLocaleString()}/
                  {g.target.toLocaleString()}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
