import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Button,
  Chip,
  Icon,
  IconButton,
  Panel,
  ProgressMeter,
  Segmented,
  Select,
  Splash,
  Switch,
  TextField,
} from '@/components/ui';
import { todayIn } from '@/lib/dates';
import { qk } from '@/lib/queryKeys';
import { createTasks, newId } from '@/modules/chores/api';
import {
  LIBRARY,
  LIBRARY_SECTIONS,
  staggeredStarts,
  type LibraryTemplate,
} from '@/modules/chores/library';
import { describeSchedule } from '@/modules/chores/schedule';
import { createHousehold, createMemberInvite, updateSettings } from '@/modules/households/api';
import { useMembershipQuery, usePublicConfig } from '@/modules/households/hooks';
import { guessTimezone, inviteLink, timezoneOptions } from '@/modules/households/logic';
import { DEFAULT_MODULES, type Modules } from '@/modules/households/types';
import { createLocations } from '@/modules/locations/api';
import {
  AREA_TEMPLATES,
  resolveArea,
  type AreaKey,
  type TemplateId,
} from '@/modules/locations/logic';
import { EffortIcon, getPack, useCopy, useRootTheme, type CopyKey } from '@/theme';
import { useAuth } from '../auth/AuthProvider';
import { pending } from '../auth/pending';
import { previewProps, sampleTasks } from '../components/previewData';
import { ProfileFields, type ProfileValue } from '../components/ProfileFields';
import { ThemeGallery } from '../components/ThemeGallery';

interface AreaChoice {
  key: AreaKey | 'custom';
  name: string;
  zone?: string;
  picked: boolean;
}

function areasFor(template: TemplateId): AreaChoice[] {
  return AREA_TEMPLATES[template].map((a) => ({
    key: a.key,
    name: a.name,
    zone: a.zone,
    picked: !a.optional,
  }));
}

const STEPS = ['name', 'you', 'theme', 'areas', 'modules', 'tasks', 'invite'] as const;
type Step = (typeof STEPS)[number];

const MODULE_KEYS: Array<keyof Modules> = [
  'chores',
  'lists',
  'stuff',
  'plans',
  'pantry',
  'rewards',
  'calendar',
];

/** Household setup: name, you, theme, areas, modules, starter tasks, then invite your people. */
export function SetupWizard() {
  const t = useCopy();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const membership = useMembershipQuery();
  const config = usePublicConfig();
  const { setThemeId } = useRootTheme();
  const code = pending.startCode();

  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState(guessTimezone);
  const firstName =
    String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? '').split(' ')[0] ?? '';
  const [profile, setProfile] = useState<ProfileValue>({
    displayName: firstName,
    avatar: 'classic/sprout',
    color: 'sky',
  });
  const [theme, setTheme] = useState('classic');
  const [template, setTemplate] = useState<TemplateId>('house');
  const [areas, setAreas] = useState<AreaChoice[]>(() => areasFor('house'));
  const [newArea, setNewArea] = useState('');
  const [modules, setModules] = useState<Modules>(DEFAULT_MODULES);
  // Nothing is picked for you: suggestions are one tap away.
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pickedAreaKeys = useMemo(
    () => new Set(areas.filter((a) => a.picked && a.key !== 'custom').map((a) => a.key as AreaKey)),
    [areas],
  );
  const available = useMemo(
    () => LIBRARY.filter((tpl) => resolveArea(tpl.area, pickedAreaKeys) !== null),
    [pickedAreaKeys],
  );
  const today = todayIn(timezone);
  const preview = useMemo(
    () =>
      previewProps(
        today,
        profile.displayName,
        sampleTasks(
          today,
          available.filter((x) => picked.has(x.key)).map((x) => x.title),
        ),
      ),
    [today, profile.displayName, available, picked],
  );

  if (membership.isLoading || config.isLoading) return <Splash />;
  if (membership.data && !householdId) return <Navigate to="/" replace />;
  if (!code && config.data?.household_creation !== 'open' && !householdId)
    return <Navigate to="/welcome" replace />;

  const index = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(index + 1, STEPS.length - 1)] as Step);
  const back = () => setStep(STEPS[Math.max(index - 1, 0)] as Step);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await createHousehold({
        name: name.trim(),
        timezone,
        code,
        theme,
        profile: { ...profile, displayName: profile.displayName.trim() },
      });
      if (!res.ok) {
        setError(res.error === 'rate_limited' ? t('invite.rateLimited') : t('invite.invalid'));
        return;
      }
      const hid = res.household_id;
      pending.setStartCode(null);

      // Zones first, then areas inside them.
      const zoneNames = [
        ...new Set(areas.filter((a) => a.picked && a.zone).map((a) => a.zone as string)),
      ];
      const zoneIds = new Map(zoneNames.map((z) => [z, newId()]));
      await createLocations(
        zoneNames.map((z, i) => ({
          id: zoneIds.get(z),
          household_id: hid,
          kind: 'zone',
          name: z,
          sort: i + 1,
        })),
      );
      const areaIds = new Map<string, string>();
      const areaRows = areas
        .filter((a) => a.picked)
        .map((a, i) => {
          const id = newId();
          if (a.key !== 'custom') areaIds.set(a.key, id);
          return {
            id,
            household_id: hid,
            kind: 'area' as const,
            name: a.name,
            parent_id: a.zone ? zoneIds.get(a.zone) : null,
            sort: i + 1,
          };
        });
      await createLocations(areaRows);

      const chosen = available.filter((tpl) => picked.has(tpl.key));
      const starts = staggeredStarts(chosen, today);
      await createTasks(
        hid,
        chosen.map((tpl: LibraryTemplate) => {
          const area = resolveArea(tpl.area, pickedAreaKeys);
          return {
            title: tpl.title,
            notes: null,
            location_id: area ? (areaIds.get(area) ?? null) : null,
            effort: tpl.effort,
            priority: 'normal',
            schedule: tpl.schedule,
            if_missed: tpl.ifMissed,
            assignee_id: null,
            deed_key: tpl.deedKey ?? null,
            unit: tpl.unit ?? null,
            library_key: tpl.key,
            start_on: starts.get(tpl.key) ?? today,
          };
        }),
      );
      await updateSettings(hid, { modules });
      setHouseholdId(hid);
      setThemeId(theme);
      setStep('invite');
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const makeInvite = async () => {
    if (!householdId) return;
    setBusy(true);
    try {
      const res = await createMemberInvite(householdId);
      if (res.ok) setInviteUrl(inviteLink(window.location.origin, 'join', res.code));
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    await qc.invalidateQueries({ queryKey: qk.membership(user?.id) });
    navigate('/', { replace: true });
  };

  const canNext: Record<Step, boolean> = {
    name: name.trim().length > 0 && !!timezone,
    you: profile.displayName.trim().length > 0,
    theme: true,
    areas: areas.some((a) => a.picked),
    modules: true,
    tasks: true,
    invite: true,
  };

  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="mb-4 flex items-center gap-2">
        {index > 0 && step !== 'invite' && (
          <IconButton icon="back" label={t('common.back')} onClick={back} className="-ml-2" />
        )}
        <div className="flex-1">
          <ProgressMeter
            label={t('setup.step', { n: index + 1, total: STEPS.length })}
            value={index + 1}
            max={STEPS.length}
            size="sm"
          />
        </div>
      </div>

      {step === 'name' && (
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl">{t('setup.nameTitle')}</h1>
          <p className="text-ink-muted">{t('invite.startBody')}</p>
          <TextField
            label={t('setup.nameLabel')}
            placeholder={t('setup.namePlaceholder')}
            value={name}
            maxLength={60}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            label={t('setup.timezoneLabel')}
            hint={t('setup.timezoneHint')}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {timezoneOptions(guessTimezone()).map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </section>
      )}

      {step === 'you' && (
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl">{t('setup.youTitle')}</h1>
          <ProfileFields value={profile} onChange={setProfile} themeId={theme} />
        </section>
      )}

      {step === 'theme' && (
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl">{t('setup.themeTitle')}</h1>
          <p className="text-ink-muted">{t('setup.themeBody')}</p>
          <ThemeGallery
            value={theme}
            onChange={(id) => {
              setTheme(id);
              setThemeId(id);
              const pack = getPack(id);
              if (!pack.avatars.some((a) => a.id === profile.avatar))
                setProfile((p) => ({ ...p, avatar: pack.avatars[0]?.id ?? null }));
            }}
            preview={preview}
          />
        </section>
      )}

      {step === 'areas' && (
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl">{t('setup.areasTitle')}</h1>
          <p className="text-ink-muted">{t('setup.areasBody')}</p>
          <Segmented<TemplateId>
            label={t('area.plural')}
            value={template}
            onChange={(v) => {
              setTemplate(v);
              setAreas(areasFor(v));
            }}
            options={[
              { value: 'house', label: t('setup.template.house') },
              { value: 'apartment', label: t('setup.template.apartment') },
              { value: 'custom', label: t('setup.template.custom') },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            {areas.map((a, i) => (
              <Chip
                key={`${a.name}-${i}`}
                selected={a.picked}
                onClick={() =>
                  setAreas((list) =>
                    list.map((x, j) => (j === i ? { ...x, picked: !x.picked } : x)),
                  )
                }
              >
                {a.zone ? `${a.name} · ${a.zone}` : a.name}
              </Chip>
            ))}
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = newArea.trim();
              if (!n) return;
              setAreas((list) => [...list, { key: 'custom', name: n, picked: true }]);
              setNewArea('');
            }}
          >
            <TextField
              className="flex-1"
              label={t('setup.addArea')}
              value={newArea}
              maxLength={60}
              onChange={(e) => setNewArea(e.target.value)}
            />
            <Button type="submit" variant="secondary" icon="plus" disabled={!newArea.trim()}>
              {t('common.add')}
            </Button>
          </form>
        </section>
      )}

      {step === 'modules' && (
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl">{t('setup.modulesTitle')}</h1>
          <p className="text-ink-muted">{t('setup.modulesBody')}</p>
          <Panel className="flex flex-col divide-y divide-line py-1">
            {MODULE_KEYS.map((k) => (
              <Switch
                key={k}
                label={t(`module.${k}` as CopyKey)}
                checked={modules[k]}
                disabled={k === 'chores'}
                onChange={(v) => setModules((m) => ({ ...m, [k]: v }))}
              />
            ))}
          </Panel>
        </section>
      )}

      {step === 'tasks' && (
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl">{t('setup.tasksTitle')}</h1>
          <p className="text-ink-muted">
            {t('setup.tasksBody')}{' '}
            {t('setup.tasksCount', { count: available.filter((x) => picked.has(x.key)).length })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon="sparkle"
              onClick={() =>
                setPicked(
                  (s) =>
                    new Set([...s, ...available.filter((x) => x.recommended).map((x) => x.key)]),
                )
              }
            >
              {t('setup.tasksSuggested', { count: available.filter((x) => x.recommended).length })}
            </Button>
            {picked.size > 0 && (
              <Button variant="ghost" onClick={() => setPicked(new Set())}>
                {t('setup.tasksClear')}
              </Button>
            )}
          </div>
          {LIBRARY_SECTIONS.map((section) => {
            const list = available.filter((x) => x.section === section);
            if (list.length === 0) return null;
            return (
              <Panel key={section} padded={false} className="overflow-hidden">
                <h2 className="px-4 pb-1 pt-3 text-base">
                  {t(`library.section.${section}` as CopyKey)}
                </h2>
                <ul className="divide-y divide-line">
                  {list.map((tpl) => {
                    const on = picked.has(tpl.key);
                    return (
                      <li key={tpl.key}>
                        <label className="flex min-h-[56px] cursor-pointer items-center gap-3 px-4 py-2">
                          <input
                            type="checkbox"
                            className="h-5 w-5 shrink-0 accent-[var(--primary)]"
                            checked={on}
                            onChange={() =>
                              setPicked((s) => {
                                const n = new Set(s);
                                if (on) n.delete(tpl.key);
                                else n.add(tpl.key);
                                return n;
                              })
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold leading-snug">{tpl.title}</span>
                            <span className="flex items-center gap-2 text-[13px] text-ink-muted">
                              <EffortIcon level={tpl.effort} />
                              {describeSchedule(tpl.schedule, t)}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            );
          })}
        </section>
      )}

      {step === 'invite' && (
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl">{t('setup.inviteTitle')}</h1>
          <p className="text-ink-muted">{t('setup.inviteBody')}</p>
          {inviteUrl ? (
            <Panel className="flex flex-col gap-3">
              <p className="break-all font-num text-sm">{inviteUrl}</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  icon="copy"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(inviteUrl);
                    setCopied(true);
                  }}
                >
                  {copied ? t('common.copied') : t('common.copy')}
                </Button>
                {typeof navigator.share === 'function' && (
                  <Button
                    variant="secondary"
                    icon="link"
                    onClick={() => void navigator.share({ url: inviteUrl }).catch(() => undefined)}
                  >
                    {t('common.share')}
                  </Button>
                )}
              </div>
            </Panel>
          ) : (
            <Button variant="secondary" icon="users" loading={busy} onClick={makeInvite}>
              {t('setup.inviteCreate')}
            </Button>
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="mt-4 font-bold">
          <Icon name="close" size={16} className="mr-1 inline" />
          {error}
        </p>
      )}

      <div className="mt-8">
        {step === 'tasks' ? (
          <Button size="lg" block loading={busy} onClick={create}>
            {busy ? t('setup.creating') : t('setup.create')}
          </Button>
        ) : step === 'invite' ? (
          <Button size="lg" block onClick={finish}>
            {t('setup.finish')}
          </Button>
        ) : (
          <Button size="lg" block disabled={!canNext[step]} onClick={next}>
            {t('common.next')}
          </Button>
        )}
      </div>
    </main>
  );
}
