import { useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Button,
  Chip,
  Icon,
  IconButton,
  Logo,
  Panel,
  ProgressMeter,
  SectionTitle,
  Segmented,
  Select,
  Sheet,
  Switch,
  TabBar,
  Tag,
  TextField,
  useToast,
} from '@/components/ui';
import { todayIn } from '@/lib/dates';
import { TaskRow } from '@/modules/chores/components/TaskRow';
import { TodayView } from '@/modules/chores/components/TodayView';
import {
  BadgeFrame,
  EffortIcon,
  LEVEL_BANDS,
  THEME_PACKS,
  ThemeScope,
  levelTitle,
  useCelebrate,
  useCopy,
  usePack,
  useRootTheme,
  type BadgeTier,
  type CelebrationEvent,
  type CopyKey,
  type ModePreference,
} from '@/theme';
import { contrastRatio, TEXT_PAIRS } from '@/theme/contrast';
import { MEMBER_COLORS } from '@/theme/memberColors';
import { previewProps, sampleTasks } from '../components/previewData';

const SHARED_KEYS: CopyKey[] = [
  'app.today',
  'task.singular',
  'task.plural',
  'task.complete',
  'task.completeToast',
  'task.waiting',
  'task.skip',
  'area.plural',
  'member.singular',
  'household.name',
  'meter.name',
  'meter.full',
  'streak.name',
  'stuff.name',
  'plans.name',
  'lists.toBuy',
  'badge.singular',
  'badge.plural',
  'level.up',
  'coins.name',
  'shop.name',
  'deed.logFix',
];

const SWATCHES = [
  'bg',
  'surface',
  'surface-2',
  'ink',
  'ink-muted',
  'line',
  'primary',
  'secondary',
  'accent',
  'success',
  'warning',
  'danger',
];

function Swatches() {
  const ref = useRef<HTMLDivElement>(null);
  const [, force] = useState(0);
  const read = (name: string) =>
    ref.current ? getComputedStyle(ref.current).getPropertyValue(`--${name}`).trim() : '';
  return (
    <div ref={ref} onPointerEnter={() => force((n) => n + 1)}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {SWATCHES.map((s) => (
          <div key={s} className="overflow-hidden rounded-theme-sm shadow-[0_0_0_1px_var(--line)]">
            <div className="h-12" style={{ background: `var(--${s})` }} />
            <div className="bg-surface px-2 py-1 text-xs">
              <div className="font-bold">--{s}</div>
            </div>
          </div>
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        {TEXT_PAIRS.map(([fg, bg]) => {
          const a = read(fg);
          const b = read(bg);
          const ratio =
            /^#[0-9a-f]{6}$/i.test(a) && /^#[0-9a-f]{6}$/i.test(b) ? contrastRatio(a, b) : null;
          return (
            <li
              key={`${fg}-${bg}`}
              className="flex items-center gap-2 rounded-theme-sm px-2 py-1.5"
              style={{ color: `var(--${fg})`, background: `var(--${bg})` }}
            >
              <span className="flex-1 font-bold">
                {fg} on {bg}
              </span>
              <span className="font-num">{ratio ? `${ratio.toFixed(1)}:1` : ''}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Kit() {
  const t = useCopy();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button>{t('common.save')}</Button>
        <Button variant="secondary" icon="plus">
          {t('common.add')}
        </Button>
        <Button variant="ghost">{t('common.cancel')}</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip selected>{t('day.today')}</Chip>
        <Chip>{t('day.yesterday')}</Chip>
        <Tag tone="accent">{t('task.waiting', { day: 'Mon' })}</Tag>
      </div>
      <ProgressMeter
        label={t('meter.name')}
        value={260}
        max={400}
        valueText={t('today.meterBody', { value: 260, target: 400 })}
      />
    </div>
  );
}

export function StyleguidePage() {
  const { themeId, modePreference, mode, setThemeId, setModePreference } = useRootTheme();
  const t = useCopy();
  const pack = usePack();
  const toast = useToast();
  const celebrate = useCelebrate();
  const [sheet, setSheet] = useState(false);
  const [on, setOn] = useState(true);
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [done, setDone] = useState(false);
  const today = todayIn('UTC');
  const tasks = useMemo(() => sampleTasks(today), [today]);
  const preview = useMemo(() => previewProps(today, 'Alex', tasks), [today, tasks]);
  const tiers: BadgeTier[] = ['locked', 'bronze', 'silver', 'gold'];
  const events: CelebrationEvent[] = ['taskComplete', 'badgeEarned', 'levelUp', 'meterFull'];
  const eventText: Record<CelebrationEvent, string | undefined> = {
    taskComplete: undefined,
    badgeEarned: t('badge.singular'),
    levelUp: t('level.up'),
    meterFull: t('meter.full'),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24">
      <header className="sticky top-0 z-30 -mx-4 border-b border-line bg-bg/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <h1 className="flex-1 text-2xl">{t('styleguide.title')}</h1>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {THEME_PACKS.map((p) => (
            <Chip key={p.id} selected={themeId === p.id} onClick={() => setThemeId(p.id)}>
              {p.name}
            </Chip>
          ))}
        </div>
        <Segmented<ModePreference>
          className="mt-2"
          label={t('settings.mode')}
          value={modePreference}
          onChange={setModePreference}
          options={[
            { value: 'system', label: t('settings.mode.system') },
            { value: 'light', label: t('settings.mode.light') },
            { value: 'dark', label: t('settings.mode.dark') },
          ]}
        />
      </header>

      <p className="mt-4 text-ink-muted">
        <strong className="text-ink">{pack.name}</strong> · {pack.description}
      </p>

      <SectionTitle>Tokens and contrast</SectionTitle>
      <Panel>
        <Swatches />
      </Panel>

      <SectionTitle>Type</SectionTitle>
      <Panel className="flex flex-col gap-1">
        <p className="font-display text-4xl">{t('app.today')}</p>
        <p className="font-display text-2xl">{t('today.dueHeading')}</p>
        <p>{t('auth.subtitle')}</p>
        <p className="text-sm text-ink-muted">{t('today.allClearBody')}</p>
        <p className="font-num text-3xl font-bold">1,800 · 42</p>
      </Panel>

      <SectionTitle>Buttons</SectionTitle>
      <Panel className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button icon="check">{t('task.complete')}</Button>
          <Button variant="secondary" icon="skip">
            {t('task.skip')}
          </Button>
          <Button variant="ghost" icon="undo">
            {t('common.undo')}
          </Button>
          <Button variant="danger">{t('settings.remove')}</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <IconButton icon="more" label={t('task.moreActions', { task: 'Sample' })} />
        </div>
      </Panel>

      <SectionTitle>Chips and tags</SectionTitle>
      <Panel className="flex flex-wrap gap-2">
        <Chip selected>{t('day.today')}</Chip>
        <Chip>{t('day.yesterday')}</Chip>
        <Chip leading={<Icon name="calendar" size={16} />}>{t('day.pick')}</Chip>
        <Tag>{t('history.skipped')}</Tag>
        <Tag tone="accent">{t('task.waiting', { day: 'Mon' })}</Tag>
        <Tag tone="secondary">{t('today.thisMonth')}</Tag>
        <Tag tone="success">{t('operator.status.active')}</Tag>
      </Panel>

      <SectionTitle>Task rows</SectionTitle>
      <ul className="flex flex-col gap-2">
        <TaskRow
          task={tasks[0]!}
          state={done ? 'done' : 'due'}
          today={today}
          location="Kitchen"
          onDone={(el) => {
            setDone(true);
            celebrate('taskComplete', { from: el });
            toast.show({ message: t('task.completeToast'), onUndo: () => setDone(false) });
          }}
          onMore={() => setSheet(true)}
        />
        <TaskRow
          task={tasks[2]!}
          state="waiting"
          waitingSince={tasks[2]!.start_on}
          today={today}
          location="Main bedroom"
          onDone={() => undefined}
          onMore={() => setSheet(true)}
        />
        <TaskRow task={tasks[1]!} state="done" today={today} location="Living room" />
      </ul>

      <SectionTitle>Fields</SectionTitle>
      <Panel className="flex flex-col gap-4">
        <TextField label={t('task.title')} placeholder={t('setup.namePlaceholder')} />
        <TextField
          label={t('task.quantity', { unit: 'valves' })}
          type="number"
          error={t('common.error')}
        />
        <Select label={t('task.priority')}>
          <option>{t('task.priority.normal')}</option>
          <option>{t('task.priority.high')}</option>
        </Select>
        <Segmented
          label={t('task.ifMissed')}
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'a', label: t('task.ifMissed.carry') },
            { value: 'b', label: t('task.ifMissed.let_go') },
            { value: 'c', label: t('common.optional') },
          ]}
        />
        <Switch
          label={t('module.pantry')}
          description={t('setup.modulesBody')}
          checked={on}
          onChange={setOn}
        />
      </Panel>

      <SectionTitle>Progress</SectionTitle>
      <Panel className="flex flex-col gap-4">
        <ProgressMeter
          label={t('meter.name')}
          value={260}
          max={400}
          valueText="260 / 400"
          size="lg"
        />
        <ProgressMeter
          label={t('areas.freshness')}
          value={80}
          max={100}
          valueText={t('areas.freshPercent', { percent: 80 })}
          tone="success"
        />
        <ProgressMeter
          label={t('areas.freshness')}
          value={30}
          max={100}
          valueText={t('areas.freshPercent', { percent: 30 })}
          tone="secondary"
          size="sm"
        />
      </Panel>

      <SectionTitle>Effort icons</SectionTitle>
      <Panel className="flex items-center gap-6">
        {([1, 2, 3] as const).map((l) => (
          <span key={l} className="flex items-center gap-2 text-sm">
            <EffortIcon level={l} /> {l}
          </span>
        ))}
      </Panel>

      <SectionTitle>{t('badge.plural')}</SectionTitle>
      <Panel className="flex flex-wrap items-end justify-around gap-4">
        {tiers.map((tier) => (
          <div key={tier} className="flex flex-col items-center gap-1 text-xs">
            <BadgeFrame tier={tier} label={tier}>
              <Icon name="sparkle" size={26} />
            </BadgeFrame>
            {tier}
          </div>
        ))}
      </Panel>

      <SectionTitle>Level titles</SectionTitle>
      <Panel>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LEVEL_BANDS.map((lv) => (
            <li key={lv} className="rounded-theme-sm bg-surface-2 px-3 py-2 font-display">
              {t('level.label', { level: lv, title: levelTitle(pack.levelTitles, lv) })}
            </li>
          ))}
        </ul>
      </Panel>

      <SectionTitle>Avatars</SectionTitle>
      <Panel>
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {pack.avatars.map((a, i) => (
            <li key={a.id} className="flex flex-col items-center gap-1 text-center text-xs">
              <Avatar
                avatar={a.id}
                color={MEMBER_COLORS[i % MEMBER_COLORS.length]?.id}
                name={a.name}
                size={64}
              />
              {a.name}
            </li>
          ))}
        </ul>
      </Panel>

      <SectionTitle>Celebrations</SectionTitle>
      <Panel className="flex flex-wrap gap-2">
        {events.map((ev) => (
          <Button
            key={ev}
            variant="secondary"
            onClick={(e) => celebrate(ev, { from: e.currentTarget, text: eventText[ev] })}
          >
            {ev}
          </Button>
        ))}
      </Panel>

      <SectionTitle>Sheet and toast</SectionTitle>
      <Panel className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setSheet(true)}>
          Sheet
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast.show({ message: t('task.completeToast'), onUndo: () => undefined })}
        >
          Toast + {t('common.undo')}
        </Button>
      </Panel>

      <SectionTitle>Tab bar</SectionTitle>
      <div className="overflow-hidden rounded-theme pt-20 shadow-[0_0_0_1px_var(--line)]">
        <TabBar
          inline
          label="Preview"
          items={[
            { to: '/styleguide', label: t('nav.today'), icon: 'today' },
            { to: '/lists', label: t('nav.lists'), icon: 'lists' },
            { to: '/stuff', label: t('nav.stuff'), icon: 'stuff' },
            { to: '/plans', label: t('nav.plans'), icon: 'plans' },
            { to: '/me', label: t('nav.me'), icon: 'me' },
          ]}
          action={{ to: '/scan', label: t('nav.scan'), icon: 'scan' }}
        />
      </div>

      <SectionTitle>Vocabulary</SectionTitle>
      <Panel padded={false}>
        <dl className="divide-y divide-line text-sm">
          {SHARED_KEYS.map((k) => (
            <div key={k} className="flex gap-3 px-4 py-2">
              <dt className="w-36 shrink-0 font-num text-ink-muted">{k}</dt>
              <dd className="font-bold">{t(k, { day: 'Mon' })}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <SectionTitle>Today, in every theme</SectionTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {THEME_PACKS.flatMap((p) =>
          (['light', 'dark'] as const).map((m) => (
            <ThemeScope
              key={`${p.id}-${m}`}
              themeId={p.id}
              mode={m}
              className="overflow-hidden rounded-theme bg-bg px-3 pb-4 shadow-[0_0_0_1px_var(--line)] [background-image:var(--texture)]"
            >
              <p className="pt-3 text-xs font-bold text-ink-muted">
                {p.name} · {m}
              </p>
              <Kit />
              <div className="mt-3">
                <TodayView {...preview} />
              </div>
            </ThemeScope>
          )),
        )}
      </div>

      <p className="mt-8 text-center text-xs text-ink-muted">
        {themeId} · {mode}
      </p>

      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        title={tasks[0]!.title}
        footer={
          <Button block onClick={() => setSheet(false)}>
            {t('task.logIt')}
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Chip selected>{t('day.today')}</Chip>
          <Chip>{t('day.yesterday')}</Chip>
          <Chip>{t('day.daysAgo', { count: 2 })}</Chip>
        </div>
      </Sheet>
    </div>
  );
}
