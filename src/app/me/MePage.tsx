import { Link } from 'react-router-dom';
import { Avatar, Icon, IconButton, Tag, type IconName } from '@/components/ui';
import { signOut } from '@/modules/households/api';
import { useHousehold } from '@/modules/households/context';
import { useIsOperator, useUpdateProfile } from '@/modules/households/hooks';
import { HeroArt, useCopy, type CopyKey, type ModePreference } from '@/theme';
import { MEMBER_COLORS, MEMBER_INK } from '@/theme/memberColors';
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

  // Big, colorful tiles for the places people go most; settings stay in a short list.
  const tiles: Array<{ to: string; icon: IconName; label: CopyKey }> = [
    ...(settings.modules.calendar
      ? [{ to: '/calendar', icon: 'calendar' as const, label: 'calendar.title' as const }]
      : []),
    ...(settings.modules.plans
      ? [{ to: '/talk', icon: 'chat' as const, label: 'talk.title' as const }]
      : []),
    { to: '/areas', icon: 'zone', label: 'areas.title' },
    { to: '/upcoming', icon: 'clock', label: 'upcoming.title' },
    { to: '/history', icon: 'history', label: 'history.title' },
    ...(settings.modules.rewards
      ? [{ to: '/feed', icon: 'feed' as const, label: 'feed.title' as const }]
      : []),
  ];

  return (
    <div className="pb-6">
      <header className="sp-panel relative -mx-1 mt-[calc(0.75rem+env(safe-area-inset-top))] overflow-hidden p-4">
        <HeroArt
          variant="tab"
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-[65%]"
        />
        <div className="relative flex items-center gap-3">
          <Avatar
            avatar={member.avatar}
            color={member.color}
            name={member.display_name}
            size={72}
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl leading-tight">{member.display_name}</h1>
            <p className="truncate text-sm text-ink-muted">{household.name}</p>
          </div>
          <IconButton
            icon={modeIcon[member.mode]}
            label={t('me.modeToggle', { mode: t(`settings.mode.${member.mode}` as CopyKey) })}
            onClick={() => updateProfile.mutate({ mode: nextMode[member.mode] })}
            className="self-start bg-surface shadow-card"
          />
        </div>
      </header>

      {settings.modules.rewards && <RewardsPanel />}

      <ul className="mt-5 grid grid-cols-3 gap-2">
        {tiles.map((tile, i) => (
          <li key={tile.to}>
            <Link
              to={tile.to}
              className="sp-panel flex aspect-square flex-col items-center justify-center gap-2 p-2 text-center"
            >
              <span
                className="grid h-11 w-11 place-items-center rounded-theme-sm"
                style={{
                  background: MEMBER_COLORS[i % MEMBER_COLORS.length]!.hex,
                  color: MEMBER_INK,
                }}
                aria-hidden
              >
                <Icon name={tile.icon} size={22} />
              </span>
              <span className="text-[13px] font-bold leading-tight">{t(tile.label)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <ul className="sp-panel mt-5 divide-y divide-line">
        <MenuLink to="/settings/personal" icon="palette" label={t('me.personal')} />
        <MenuLink to="/settings/household" icon="home" label={t('me.household')} />
        <MenuLink to="/help" icon="sparkle" label={t('help.menu')} />
        <MenuLink
          to="/updates"
          icon="star"
          label={t('updates.title')}
          badge={unseen ? t('updates.newBadge') : undefined}
        />
      </ul>

      <button
        type="button"
        onClick={() => void signOut()}
        className="mx-auto mt-6 flex min-h-[44px] items-center gap-2 px-4 font-bold text-ink-muted"
      >
        <Icon name="logout" size={18} />
        {t('auth.signOut')}
      </button>
      <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 text-center text-xs text-ink-muted">
        <span className="font-num">{t('updates.version', { version: APP_VERSION })}</span>
        <Link
          to="/privacy"
          className="inline-flex min-h-[44px] items-center underline underline-offset-2"
        >
          {t('legal.privacyTitle')}
        </Link>
        {/* Only the person running this copy sees this (their email is in OPERATOR_EMAILS). */}
        {operator.data && (
          <Link
            to="/operator"
            className="inline-flex min-h-[44px] items-center underline underline-offset-2"
          >
            {t('operator.title')}
          </Link>
        )}
      </p>
    </div>
  );
}
