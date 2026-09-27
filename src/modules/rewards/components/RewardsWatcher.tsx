import { useEffect, useRef } from 'react';
import { useHousehold } from '@/modules/households/context';
import { useCelebrate, useCopy } from '@/theme';
import { getBadge } from '../badges';
import { useMyBadges, useMyRewards } from '../hooks';

/**
 * Celebrates your own level-ups and new badge tiers when they arrive, however
 * they arrive (your tap, a catch-up, or a housemate logging for you). The
 * first load only records the starting point.
 */
export function RewardsWatcher() {
  const { settings } = useHousehold();
  const t = useCopy();
  const celebrate = useCelebrate();
  const rewards = useMyRewards();
  const badges = useMyBadges();
  const lastLevel = useRef<number | null>(null);
  const lastTiers = useRef<Map<string, number> | null>(null);
  const enabled = settings.modules.rewards;

  useEffect(() => {
    const level = rewards.data?.level;
    if (level == null) return;
    if (enabled && lastLevel.current != null && level > lastLevel.current) {
      setTimeout(() => celebrate('levelUp', { text: `${t('level.up')} Lv ${level}` }), 500);
    }
    lastLevel.current = level;
  }, [rewards.data?.level, celebrate, t, enabled]);

  useEffect(() => {
    if (!badges.data) return;
    const now = new Map(badges.data.map((b) => [b.badge_key, b.tier]));
    if (enabled && lastTiers.current) {
      const fresh = badges.data.find((b) => b.tier > (lastTiers.current!.get(b.badge_key) ?? 0));
      const info = fresh && getBadge(fresh.badge_key);
      if (info)
        setTimeout(
          () => celebrate('badgeEarned', { text: `${t('badge.singular')}: ${info.name}` }),
          900,
        );
    }
    lastTiers.current = now;
  }, [badges.data, celebrate, t, enabled]);

  return null;
}
