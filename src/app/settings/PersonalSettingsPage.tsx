import { useMemo, useState } from 'react';
import { Button, PageHeader, Panel, SectionTitle, Segmented, Switch } from '@/components/ui';
import { hourIn } from '@/lib/dates';
import { useChores } from '@/modules/chores/hooks';
import { buildToday, weeklyPoints } from '@/modules/chores/logic';
import { useHousehold } from '@/modules/households/context';
import { useUpdateProfile } from '@/modules/households/hooks';
import { locationLabel } from '@/modules/locations/logic';
import { getPack, useCopy, type ModePreference } from '@/theme';
import { ProfileFields, type ProfileValue } from '../components/ProfileFields';
import { ThemeGallery } from '../components/ThemeGallery';

export function PersonalSettingsPage() {
  const t = useCopy();
  const { member, settings, household, today, memberById } = useHousehold();
  const { tasks, completions, locations, ctx } = useChores();
  const update = useUpdateProfile();
  const [profile, setProfile] = useState<ProfileValue>({
    displayName: member.display_name,
    avatar: member.avatar,
    color: member.color,
  });

  // The gallery previews this member's real Today screen.
  const preview = useMemo(() => {
    const effort = new Map(tasks.map((x) => [x.id, x.effort]));
    return {
      name: member.display_name,
      hour: hourIn(household.timezone),
      today,
      view: buildToday(tasks, completions, today, ctx),
      meter: {
        value: weeklyPoints(completions, (id) => effort.get(id), today),
        target: settings.weekly_target,
      },
      zoneNames: [],
      catchUpCount: 0,
      locationName: (id: string | null) => locationLabel(id, locations),
      memberById,
    };
  }, [
    tasks,
    completions,
    today,
    ctx,
    member.display_name,
    household.timezone,
    settings.weekly_target,
    locations,
    memberById,
  ]);

  const dirty =
    profile.displayName.trim() !== member.display_name ||
    profile.avatar !== member.avatar ||
    profile.color !== member.color;

  return (
    <div className="pb-6">
      <PageHeader title={t('settings.personalTitle')} back />

      <SectionTitle>{t('settings.profile')}</SectionTitle>
      <Panel>
        <ProfileFields
          value={profile}
          onChange={setProfile}
          themeId={member.theme ?? settings.default_theme}
        />
        <Button
          className="mt-4"
          block
          disabled={!dirty || !profile.displayName.trim()}
          loading={update.isPending}
          onClick={() =>
            update.mutate({
              display_name: profile.displayName.trim(),
              avatar: profile.avatar,
              color: profile.color,
            })
          }
        >
          {t('common.save')}
        </Button>
      </Panel>

      {settings.modules.rewards && (
        <Panel className="mt-4">
          <Switch
            label={t('settings.shareBadges')}
            description={t('settings.shareBadgesBody')}
            checked={member.share_badges}
            onChange={(v) => update.mutate({ share_badges: v })}
          />
        </Panel>
      )}

      <SectionTitle>{t('settings.mode')}</SectionTitle>
      <Segmented<ModePreference>
        label={t('settings.mode')}
        value={member.mode}
        onChange={(mode) => update.mutate({ mode })}
        options={[
          { value: 'system', label: t('settings.mode.system') },
          { value: 'light', label: t('settings.mode.light') },
          { value: 'dark', label: t('settings.mode.dark') },
        ]}
      />

      <SectionTitle>{t('settings.theme')}</SectionTitle>
      <ThemeGallery
        value={member.theme}
        onChange={(id) => update.mutate({ theme: id || null })}
        preview={preview}
        followLabel={t('settings.followHousehold', { theme: getPack(settings.default_theme).name })}
      />
    </div>
  );
}
