import { Avatar, EmptyState, PageHeader, Splash } from '@/components/ui';
import { dayOfInstant, mediumDate } from '@/lib/dates';
import { useHousehold } from '@/modules/households/context';
import { getBadge } from '@/modules/rewards/badges';
import { useFeed } from '@/modules/rewards/hooks';
import { useCopy, type CopyKey } from '@/theme';

/** Shared moments: new badges and redemptions people chose to share. */
export function FeedPage() {
  const t = useCopy();
  const { household, today, memberById } = useHousehold();
  const { data, isLoading } = useFeed();
  if (isLoading) return <Splash />;
  const items = data ?? [];

  return (
    <div className="pb-6">
      <PageHeader title={t('feed.title')} subtitle={t('feed.body')} back />
      {items.length === 0 ? (
        <EmptyState icon="feed" title={t('feed.empty')} />
      ) : (
        <ul className="sp-panel divide-y divide-line">
          {items.map((e) => {
            const who = memberById(e.member_id);
            const name = who?.display_name ?? '?';
            let text = '';
            if (e.kind === 'badge') {
              const info = getBadge(e.payload.badge_key ?? '');
              const badge = info?.name ?? e.payload.badge_key ?? '';
              if (e.payload.area) text = t('feed.badgeArea', { name, badge, area: e.payload.area });
              else if ((e.payload.tiers ?? 1) > 1)
                text = t('feed.badgeTier', {
                  name,
                  badge,
                  tier: t(`badges.tier.${Math.min(e.payload.tier ?? 1, 4)}` as CopyKey),
                });
              else text = t('feed.badge', { name, badge });
            } else {
              text = t('feed.redeem', {
                name,
                reward: e.payload.name ?? '',
                icon: e.payload.icon ?? '',
              });
            }
            return (
              <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                {who && (
                  <Avatar avatar={who.avatar} color={who.color} name={name} size={36} decorative />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-snug">{text}</p>
                  <p className="text-xs text-ink-muted">
                    {mediumDate(dayOfInstant(e.created_at, household.timezone), today)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
