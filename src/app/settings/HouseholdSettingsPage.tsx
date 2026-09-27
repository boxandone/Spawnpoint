import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Button,
  Chip,
  IconButton,
  PageHeader,
  Panel,
  SectionTitle,
  Select,
  Switch,
  Tag,
  TextField,
  useToast,
} from '@/components/ui';
import { mediumDate, weekdayName, dayOfInstant } from '@/lib/dates';
import { qk } from '@/lib/queryKeys';
import * as householdApi from '@/modules/households/api';
import { useHousehold } from '@/modules/households/context';
import {
  useInvalidateMembership,
  useMemberInvites,
  useUpdateHousehold,
  useUpdateSettings,
} from '@/modules/households/hooks';
import { inviteLink, inviteStatus, timezoneOptions } from '@/modules/households/logic';
import type { Modules } from '@/modules/households/types';
import { useLocationMutations, useLocations } from '@/modules/locations/hooks';
import { buildTree, listAreas } from '@/modules/locations/logic';
import { THEME_PACKS, useCopy, type CopyKey } from '@/theme';
import { Tip } from '../help/Tip';

const MODULE_KEYS: Array<keyof Modules> = [
  'chores',
  'lists',
  'stuff',
  'plans',
  'pantry',
  'rewards',
  'calendar',
];
const WEEK: number[] = [1, 2, 3, 4, 5, 6, 0];

function General() {
  const t = useCopy();
  const { household, settings, isOwner } = useHousehold();
  const updateHousehold = useUpdateHousehold();
  const updateSettings = useUpdateSettings();
  const [name, setName] = useState(household.name);
  const [timezone, setTimezone] = useState(household.timezone);
  const [target, setTarget] = useState(String(settings.weekly_target));
  useEffect(() => {
    setName(household.name);
    setTimezone(household.timezone);
    setTarget(String(settings.weekly_target));
  }, [household.name, household.timezone, settings.weekly_target]);

  const targetNum = Math.round(Number(target));
  const valid = name.trim().length > 0 && targetNum >= 50 && targetNum <= 100000;
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    await updateHousehold.mutateAsync({ name: name.trim(), timezone });
    if (targetNum !== settings.weekly_target)
      await updateSettings.mutateAsync({ weekly_target: targetNum });
  };

  return (
    <Panel>
      <form onSubmit={save} className="flex flex-col gap-4">
        {!isOwner && <p className="text-sm text-ink-muted">{t('settings.ownerOnly')}</p>}
        <fieldset disabled={!isOwner} className="flex flex-col gap-4">
          <TextField
            label={t('settings.householdName')}
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            label={t('settings.timezone')}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {timezoneOptions(household.timezone).map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
          <TextField
            label={t('settings.weeklyTarget')}
            type="number"
            inputMode="numeric"
            min={50}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <div>
            <p className="mb-2 px-0.5 text-sm font-bold">{t('settings.defaultTheme')}</p>
            <div className="flex flex-wrap gap-2">
              {THEME_PACKS.map((p) => (
                <Chip
                  key={p.id}
                  selected={settings.default_theme === p.id}
                  onClick={() => updateSettings.mutate({ default_theme: p.id })}
                >
                  {p.name}
                </Chip>
              ))}
            </div>
          </div>
          <Button
            type="submit"
            disabled={!valid}
            loading={updateHousehold.isPending || updateSettings.isPending}
          >
            {t('common.save')}
          </Button>
        </fieldset>
      </form>
    </Panel>
  );
}

function ModulesPanel() {
  const t = useCopy();
  const { settings, isOwner } = useHousehold();
  const update = useUpdateSettings();
  return (
    <Panel className="flex flex-col divide-y divide-line py-1">
      {MODULE_KEYS.map((k) => (
        <Switch
          key={k}
          label={t(`module.${k}` as CopyKey)}
          checked={settings.modules[k]}
          disabled={!isOwner || k === 'chores'}
          onChange={(v) => update.mutate({ modules: { ...settings.modules, [k]: v } })}
        />
      ))}
    </Panel>
  );
}

function Members() {
  const t = useCopy();
  const toast = useToast();
  const { members, member: me, isOwner } = useHousehold();
  const invalidate = useInvalidateMembership();
  const [confirm, setConfirm] = useState<string | null>(null);
  const active = members.filter((m) => m.status === 'active');

  return (
    <ul className="sp-panel divide-y divide-line">
      {active.map((m) => (
        <li key={m.id} className="flex min-h-[64px] flex-wrap items-center gap-3 px-4 py-2">
          <Avatar avatar={m.avatar} color={m.color} name={m.display_name} size={40} />
          <span className="min-w-0 flex-1 font-bold">
            {m.display_name}
            {m.id === me.id && (
              <span className="font-normal text-ink-muted"> · {t('common.you')}</span>
            )}
          </span>
          {m.role === 'owner' && <Tag tone="secondary">{t('settings.owner')}</Tag>}
          {isOwner && m.id !== me.id && (
            <div className="flex gap-1">
              {m.role !== 'owner' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await householdApi.setMemberRole(m.id, 'owner');
                    await invalidate();
                  }}
                >
                  {t('settings.makeOwner')}
                </Button>
              )}
              <Button
                size="sm"
                variant={confirm === m.id ? 'danger' : 'ghost'}
                onClick={async () => {
                  if (confirm !== m.id) return setConfirm(m.id);
                  await householdApi.removeMember(m.id);
                  setConfirm(null);
                  await invalidate();
                  toast.show({ message: t('settings.removed', { name: m.display_name }) });
                }}
              >
                {t('settings.remove')}
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Invites() {
  const t = useCopy();
  const qc = useQueryClient();
  const { household, today } = useHousehold();
  const invites = useMemberInvites(true);
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const active = (invites.data ?? []).filter((i) => inviteStatus(i) === 'active');

  return (
    <Panel className="flex flex-col gap-3">
      <Button
        variant="secondary"
        icon="link"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const res = await householdApi.createMemberInvite(household.id);
            if (res.ok) setFresh(inviteLink(window.location.origin, 'join', res.code));
            await qc.invalidateQueries({ queryKey: qk.invites('member') });
          } finally {
            setBusy(false);
          }
        }}
      >
        {t('settings.newInvite')}
      </Button>
      {fresh && (
        <div className="rounded-theme bg-surface-2 p-3">
          <p className="text-sm text-ink-muted">{t('operator.linkOnce')}</p>
          <p className="mt-1 break-all font-num text-sm">{fresh}</p>
          <Button
            size="sm"
            variant="secondary"
            icon="copy"
            className="mt-2"
            onClick={() => void navigator.clipboard?.writeText(fresh)}
          >
            {t('common.copy')}
          </Button>
        </div>
      )}
      {active.length > 0 && (
        <ul className="divide-y divide-line">
          {active.map((i) => (
            <li key={i.id} className="flex min-h-[48px] items-center gap-2">
              <span className="flex-1 text-sm">
                {t('settings.expires', {
                  day: mediumDate(dayOfInstant(i.expires_at, household.timezone), today),
                })}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await householdApi.revokeInvite(i.id);
                  await qc.invalidateQueries({ queryKey: qk.invites('member') });
                }}
              >
                {t('settings.revoke')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ZoneRotation() {
  const t = useCopy();
  const { settings, isOwner } = useHousehold();
  const update = useUpdateSettings();
  const { locations } = useLocations();
  const areas = useMemo(() => listAreas(locations), [locations]);
  return (
    <Panel className="flex flex-col gap-3">
      <Tip id="rotation" text="tip.rotation" />
      <p className="text-sm text-ink-muted">{t('settings.zoneRotationBody')}</p>
      {WEEK.map((wd) => (
        <Select
          key={wd}
          label={weekdayName(wd, true)}
          disabled={!isOwner}
          value={settings.zone_rotation[String(wd)]?.[0] ?? ''}
          onChange={(e) => {
            const next = { ...settings.zone_rotation };
            if (e.target.value) next[String(wd)] = [e.target.value];
            else delete next[String(wd)];
            update.mutate({ zone_rotation: next });
          }}
        >
          <option value="">—</option>
          {areas.map(({ area, zone }) => (
            <option key={area.id} value={area.id}>
              {zone ? `${zone.name} › ${area.name}` : area.name}
            </option>
          ))}
        </Select>
      ))}
    </Panel>
  );
}

function AreasEditor() {
  const t = useCopy();
  const toast = useToast();
  const { locations } = useLocations();
  const { create, update } = useLocationMutations();
  const tree = useMemo(() => buildTree(locations), [locations]);
  const zones = locations.filter((l) => l.kind === 'zone' && !l.archived_at);
  const areas = useMemo(() => listAreas(locations), [locations]);
  const [kind, setKind] = useState<'zone' | 'area' | 'spot'>('area');
  const [name, setName] = useState('');
  const [parent, setParent] = useState('');

  const archive = (id: string, label: string) => {
    update.mutate({ id, patch: { archived_at: new Date().toISOString() } });
    toast.show({
      message: `${label} · ${t('common.archive')}`,
      onUndo: () => update.mutate({ id, patch: { archived_at: null } }),
    });
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (kind === 'spot' && !parent)) return;
    create.mutate([
      {
        kind,
        name: name.trim(),
        parent_id: kind === 'zone' ? null : parent || null,
        sort: locations.length + 1,
      },
    ]);
    setName('');
  };

  const Row = ({ id, label, depth }: { id: string; label: string; depth: number }) => (
    <li className="flex min-h-[48px] items-center gap-2" style={{ paddingLeft: depth * 16 }}>
      <span className="flex-1">{label}</span>
      <IconButton
        icon="archive"
        label={`${t('common.archive')} ${label}`}
        onClick={() => archive(id, label)}
        className="text-ink-muted"
      />
    </li>
  );

  return (
    <Panel className="flex flex-col gap-3">
      <ul className="divide-y divide-line">
        {tree.flatMap((n) => [
          <Row key={n.location.id} id={n.location.id} label={n.location.name} depth={0} />,
          ...n.children.flatMap((c) => [
            <Row key={c.location.id} id={c.location.id} label={c.location.name} depth={1} />,
            ...c.children.map((s) => (
              <Row key={s.location.id} id={s.location.id} label={s.location.name} depth={2} />
            )),
          ]),
        ])}
      </ul>
      <form onSubmit={add} className="flex flex-col gap-3 rounded-theme bg-surface-2 p-3">
        <div className="flex flex-wrap gap-2">
          <Chip selected={kind === 'zone'} onClick={() => setKind('zone')}>
            {t('settings.addZone')}
          </Chip>
          <Chip selected={kind === 'area'} onClick={() => setKind('area')}>
            {t('settings.addArea')}
          </Chip>
          <Chip selected={kind === 'spot'} onClick={() => setKind('spot')}>
            {t('settings.addSpot')}
          </Chip>
        </div>
        {kind !== 'zone' && (
          <Select
            label={kind === 'spot' ? t('area.singular') : t('settings.addZone')}
            value={parent}
            onChange={(e) => setParent(e.target.value)}
          >
            <option value="">{kind === 'spot' ? '—' : t('task.noLocation')}</option>
            {(kind === 'spot' ? areas.map((a) => a.area) : zones).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        )}
        <TextField
          label={t('settings.locationName')}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          type="submit"
          variant="secondary"
          icon="plus"
          disabled={!name.trim() || (kind === 'spot' && !parent)}
        >
          {t('common.add')}
        </Button>
      </form>
    </Panel>
  );
}

export function HouseholdSettingsPage() {
  const t = useCopy();
  const navigate = useNavigate();
  const { isOwner, members } = useHousehold();
  const invalidate = useInvalidateMembership();
  const owners = members.filter((m) => m.status === 'active' && m.role === 'owner').length;

  return (
    <div className="pb-6">
      <PageHeader title={t('settings.householdTitle')} back />
      <General />
      <SectionTitle>{t('settings.modules')}</SectionTitle>
      <ModulesPanel />
      <SectionTitle>{t('settings.members')}</SectionTitle>
      <Members />
      {isOwner && (
        <>
          <SectionTitle>{t('settings.invites')}</SectionTitle>
          <Invites />
        </>
      )}
      <SectionTitle>{t('settings.zoneRotation')}</SectionTitle>
      <ZoneRotation />
      <SectionTitle>{t('settings.areas')}</SectionTitle>
      <AreasEditor />
      {!(isOwner && owners <= 1) && (
        <Button
          variant="ghost"
          icon="logout"
          block
          className="mt-6"
          onClick={async () => {
            await householdApi.leaveHousehold();
            await invalidate();
            navigate('/welcome');
          }}
        >
          {t('settings.leave')}
        </Button>
      )}
    </div>
  );
}
