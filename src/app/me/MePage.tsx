import { Link } from 'react-router-dom';
import { Avatar, Icon, Panel, SectionTitle, Tag, type IconName } from '@/components/ui';
import { signOut } from '@/modules/households/api';
import { useHousehold } from '@/modules/households/context';
import { useIsOperator } from '@/modules/households/hooks';
import { BadgeFrame, useCopy, usePack, type CopyKey } from '@/theme';
import { APP_VERSION } from '../updates/releases';
import { useUnseenUpdate } from '../updates/useUpdates';

function MenuLink({
  to,
  icon,
  label,
  badge,
}: {
  to: string;
  icon: IconName;
  label: string;
  badge?: string;
}) {
  return (
    <li>
      <Link to={to} className="flex min-h-[56px] items-center gap-3 px-4">
        <span className="grid h-9 w-9 place-items-center rounded-theme-sm bg-surface-2">
          <Icon name={icon} size={20} />
        </span>
        <span className="flex-1 font-bold">{label}</span>
        {badge && <Tag tone="accent">{badge}</Tag>}
        <Icon name="chevron" size={18} className="text-ink-muted" />
      </Link>
    </li>
  );
}

/** Me: your profile and the More menu. Levels, badges, and coins arrive in Phase 2. */
export function MePage() {
  const t = useCopy();
  const pack = usePack();
  const { member, household } = useHousehold();
  const operator = useIsOperator();
  const { unseen } = useUnseenUpdate();

  const more: Array<{ to: string; icon: IconName; label: CopyKey }> = [
    { to: '/areas', icon: 'zone', label: 'areas.title' },
    { to: '/upcoming', icon: 'calendar', label: 'upcoming.title' },
    { to: '/history', icon: 'history', label: 'history.title' },
    { to: '/settings/personal', icon: 'palette', label: 'me.personal' },
    { to: '/settings/household', icon: 'home', label: 'me.household' },
  ];

  return (
    <div>
      <header className="flex flex-col items-center pb-2 pt-[calc(1.5rem+env(safe-area-inset-top))] text-center">
        <Avatar avatar={member.avatar} color={member.color} name={member.display_name} size={96} />
        <h1 className="mt-3 text-3xl">{member.display_name}</h1>
        <p className="text-ink-muted">
          {t('household.name')} · {household.name}
        </p>
      </header>

      <Panel className="mt-4 flex items-center gap-4">
        <BadgeFrame tier="locked" size={52} label={t('badge.plural')}>
          <Icon name="sparkle" size={22} />
        </BadgeFrame>
        <div className="min-w-0 flex-1">
          <p className="font-display">
            {t('badge.plural')} · {t('coins.name')} · {pack.levelTitles[0]}
          </p>
          <p className="text-sm text-ink-muted">{t('me.rewardsSoon')}</p>
        </div>
      </Panel>

      <SectionTitle>{t('me.more')}</SectionTitle>
      <ul className="sp-panel divide-y divide-line">
        {more.map((m) => (
          <MenuLink key={m.to} to={m.to} icon={m.icon} label={t(m.label)} />
        ))}
        <MenuLink
          to="/updates"
          icon="sparkle"
          label={t('updates.title')}
          badge={unseen ? t('updates.newBadge') : undefined}
        />
        <MenuLink to="/privacy" icon="shield" label={t('legal.privacyTitle')} />
        {operator.data && <MenuLink to="/operator" icon="shield" label={t('operator.title')} />}
      </ul>

      <button
        type="button"
        onClick={() => void signOut()}
        className="mx-auto mt-6 flex min-h-[44px] items-center gap-2 px-4 font-bold text-ink-muted"
      >
        <Icon name="logout" size={18} />
        {t('auth.signOut')}
      </button>
      <p className="mt-2 text-center font-num text-xs text-ink-muted">
        {t('updates.version', { version: APP_VERSION })}
      </p>
    </div>
  );
}
