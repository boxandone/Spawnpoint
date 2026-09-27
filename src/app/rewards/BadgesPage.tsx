import { useState } from 'react';
import { PageHeader, Panel, SectionTitle, Sheet, Splash } from '@/components/ui';
import { mediumDate } from '@/lib/dates';
import { useHousehold } from '@/modules/households/context';
import { DEED_BADGES, MILESTONES, nextThreshold, type BadgeInfo } from '@/modules/rewards/badges';
import { BadgeTile } from '@/modules/rewards/components/BadgeTile';
import { useMyBadges } from '@/modules/rewards/hooks';
import { useCopy, type CopyKey } from '@/theme';

/** Every badge: earned ones framed, the rest shown locked with how to get them. */
export function BadgesPage() {
  const t = useCopy();
  const { today } = useHousehold();
  const { data, isLoading } = useMyBadges();
  const [open, setOpen] = useState<BadgeInfo | null>(null);
  if (isLoading) return <Splash />;
  const byKey = new Map((data ?? []).map((b) => [b.badge_key, b]));
  const sortBy = (list: BadgeInfo[]) =>
    [...list].sort(
      (a, b) =>
        (byKey.get(b.key)?.tier ?? 0) - (byKey.get(a.key)?.tier ?? 0) ||
        a.name.localeCompare(b.name),
    );

  const grid = (list: BadgeInfo[]) => (
    <Panel>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {sortBy(list).map((info) => (
          <BadgeTile
            key={info.key}
            info={info}
            tier={byKey.get(info.key)?.tier ?? 0}
            onClick={() => setOpen(info)}
          />
        ))}
      </div>
    </Panel>
  );

  const row = open ? byKey.get(open.key) : undefined;
  const count = row?.count ?? 0;
  const next = open ? nextThreshold(open, count) : null;

  return (
    <div className="pb-6">
      <PageHeader title={t('badge.plural')} back="/me" />
      <SectionTitle>{t('badges.milestones')}</SectionTitle>
      {grid(MILESTONES)}
      <SectionTitle>{t('badges.deeds')}</SectionTitle>
      {grid(DEED_BADGES)}

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''}>
        {open && (
          <div className="flex flex-col items-center gap-3 pb-2 text-center">
            <BadgeTile info={open} tier={row?.tier ?? 0} size={96} />
            {(row?.tier ?? 0) > 0 && (
              <p className="font-display">
                {t(`badges.tier.${Math.min(row!.tier, 4)}` as CopyKey)}
              </p>
            )}
            {row?.tier_earned_at && (
              <p className="text-sm text-ink-muted">
                {t('badges.earnedOn', { day: mediumDate(row.tier_earned_at.slice(0, 10), today) })}
              </p>
            )}
            <p>
              {open.later
                ? t('badges.later')
                : next === null
                  ? t('badges.allTiers')
                  : open.unit
                    ? t('badges.progressUnit', { count: Math.floor(count), next, unit: open.unit })
                    : t('badges.progress', { count: Math.floor(count), next })}
            </p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
