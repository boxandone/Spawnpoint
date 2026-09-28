import { Link } from 'react-router-dom';
import { Avatar, Icon, IconButton, SectionTitle, Tag, type IconName } from '@/components/ui';
import { signOut } from '@/modules/households/api';
import { useHousehold } from '@/modules/households/context';
import { useIsOperator, useUpdateProfile } from '@/modules/households/hooks';
import { useCopy, type CopyKey, type ModePreference } from '@/theme';
import { RewardsPanel } from '../rewards/RewardsPanel';
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

/** Me: your profile, your rewards, and the More menu. */
export function MePage() {
  const t = useCopy();
  const { member, household, settings } = useHousehold();
  const operator = useIsOperator();
  const { unseen } = useUnseenUpdate();
  const updateProfile = useUpdateProfile();
  const nextMode: Record<ModePreference, ModePreference> = {
    system: 'light',
    light: 'dark',
    dark: 'system',
  };
  const modeIcon: Record<ModePreference, IconName> = {
    system: 'palette',
    light: 'sun',
    dark: 'moon',
  };

  const more: Array<{ to: string; icon: IconName; label: CopyKey }> = [
    { to: '/feed', icon: 'feed', label: 'feed.title' },
    ...(settings.modules.calendar
      ? [{ to: '/calendar', icon: 'calendar' as const, label: 'calendar.title' as const }]
      : []),
    ...(settings.modules.plans
      ? [{ to: '/talk', icon: 'chat' as const, label: 'talk.title' as const }]
      : []),
    { to: '/areas', icon: 'zone', label: 'areas.title' },
    { to: '/upcoming', icon: 'calendar', label: 'upcoming.title' },
    { to: '/history', icon: 'history', label: 'history.title' },
    { to: '/settings/personal', icon: 'palette', label: 'me.personal' },
    { to: '/settings/household', icon: 'home', label: 'me.household' },
  ];

  return (
    <div>
      <header className="flex flex-col items-center pb-2 pt-[calc(1.5rem+env(safe-area-inset-top))] text-center">
        <IconButton
          icon={modeIcon[member.mode]}
          label={t('me.modeToggle', { mode: t(`settings.mode.${member.mode}` as CopyKey) })}
          onClick={() => updateProfile.mutate({ mode: nextMode[member.mode] })}
          className="self-end bg-surface shadow-card"
        />
        <Avatar avatar={member.avatar} color={member.color} name={member.display_name} size={96} />
        <h1 className="mt-3 text-3xl">{member.display_name}</h1>
        <p className="text-ink-muted">
          {t('household.name')} · {household.name}
        </p>
      </header>

      {settings.modules.rewards && <RewardsPanel />}

      <SectionTitle>{t('me.more')}</SectionTitle>
      <ul className="sp-panel divide-y divide-line">
        {more.map((m) => (
          <MenuLink key={m.to} to={m.to} icon={m.icon} label={t(m.label)} />
        ))}
        <MenuLink to="/help" icon="sparkle" label={t('help.menu')} />
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
