import { useState, type ReactNode } from 'react';
import { EmptyState, Icon, IconButton, ProgressRing, type IconName } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { IsoDate } from '@/lib/dates';
import type { Member } from '@/modules/households/types';
import { HeroArt, useCopy } from '@/theme';
import { MEMBER_INK } from '@/theme/memberColors';
import type { TodayItem, TodayView as TodayData } from '../logic';
import type { ChoreTask } from '../types';
import { TaskRow } from './TaskRow';

export interface TodayRoom {
  id: string;
  name: string;
  icon: IconName;
  color: string;
}

export interface TodayViewProps {
  name: string;
  hour: number;
  today: IsoDate;
  view: TodayData<ChoreTask>;
  /** The household weekly meter; omitted when the rewards module is off. */
  meter?: { value: number; target: number };
  zoneNames: string[];
  catchUpCount: number;
  locationName: (id: string | null) => string | null;
  /** The room (area) a task belongs to, for grouping. Null: "Anywhere". */
  roomOf?: (task: ChoreTask) => TodayRoom | null;
  memberById: (id: string | null | undefined) => Member | undefined;
  doneByFor?: (taskId: string) => Member | undefined;
  filter?: 'all' | 'mine';
  onFilter?: (f: 'all' | 'mine') => void;
  showAllWaiting?: boolean;
  onToggleWaiting?: () => void;
  onDone?: (task: ChoreTask, el: HTMLElement) => void;
  onMore?: (task: ChoreTask) => void;
  onAdd?: () => void;
  onScan?: () => void;
  onLogFix?: () => void;
  onCatchUp?: () => void;
  onUpcoming?: () => void;
  /** Guide-mode tips, shown under the header. */
  tips?: ReactNode;
}

function RoomTile({ room, size = 32 }: { room: TodayRoom | null; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-theme-sm"
      style={{
        width: size,
        height: size,
        background: room?.color ?? 'var(--surface-2)',
        color: MEMBER_INK,
      }}
      aria-hidden
    >
      <Icon name={room?.icon ?? 'home'} size={Math.round(size * 0.56)} />
    </span>
  );
}

function ActionChip({
  icon,
  label,
  onClick,
  badge,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full bg-surface px-4 text-sm font-bold shadow-card hover:bg-surface-2"
    >
      <Icon name={icon} size={18} />
      {label}
      {badge ? (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs text-on-accent">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

/**
 * The Today screen body: a home header with what's left today and the weekly
 * goal, quick actions, then tasks grouped by room. Pure presentation, so the
 * theme gallery can render it with preview data.
 */
export function TodayView(props: TodayViewProps) {
  const t = useCopy();
  const { view, today } = props;
  const [showDone, setShowDone] = useState(false);
  const greetingKey =
    props.hour < 12
      ? 'today.greeting.morning'
      : props.hour < 18
        ? 'today.greeting.afternoon'
        : 'today.greeting.evening';
  const waiting = props.showAllWaiting ? [...view.waiting, ...view.waitingMore] : view.waiting;
  const left = view.due.length + view.waiting.length + view.waitingMore.length;

  const row = (
    item: TodayItem<ChoreTask>,
    opts: { grouped?: boolean; optional?: boolean } = {},
  ) => (
    <TaskRow
      key={item.task.id}
      task={item.task}
      state={item.status.kind}
      optional={opts.optional}
      hideLocation={opts.grouped}
      today={today}
      waitingSince={item.status.kind === 'waiting' ? item.status.occurrence.date : undefined}
      windowed={item.status.occurrence.dueBy !== item.status.occurrence.date}
      location={props.locationName(item.task.location_id)}
      assignee={props.memberById(item.task.assignee_id)}
      onDone={props.onDone ? (el) => props.onDone?.(item.task, el) : undefined}
      onMore={props.onMore ? () => props.onMore?.(item.task) : undefined}
    />
  );

  // Today's tasks, grouped by room in the order rooms first appear.
  const groups: Array<{ room: TodayRoom | null; items: TodayItem<ChoreTask>[] }> = [];
  for (const item of view.due) {
    const room = props.roomOf?.(item.task) ?? null;
    const g = groups.find((x) => (x.room?.id ?? null) === (room?.id ?? null));
    if (g) g.items.push(item);
    else groups.push({ room, items: [item] });
  }

  const meterDone = props.meter && props.meter.value >= props.meter.target;

  return (
    <div>
      <header className="sp-panel relative -mx-1 mt-[calc(0.75rem+env(safe-area-inset-top))] overflow-hidden p-4">
        <HeroArt
          variant="today"
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-[70%]"
        />
        <div className="relative flex items-start gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-ink-muted">
            {t(greetingKey)}
          </p>
          {props.onScan && (
            <IconButton
              icon="scan"
              label={t('nav.scan')}
              onClick={props.onScan}
              className="bg-surface shadow-card"
            />
          )}
          {props.onAdd && (
            <IconButton
              icon="plus"
              label={t('today.addTask')}
              onClick={props.onAdd}
              className="bg-surface shadow-card"
            />
          )}
        </div>
        <div className="relative mt-1 flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="sr-only">{t('app.today')}</h1>
            {left > 0 ? (
              <p className="leading-none">
                <span className="font-num text-6xl font-bold">{left}</span>
                <span className="mt-1 block font-display text-lg">
                  {t('today.leftLabel', { count: left })}
                </span>
              </p>
            ) : (
              <p className="font-display text-2xl leading-tight">{t('today.allClear')}</p>
            )}
            {view.doneToday.length > 0 && (
              <p className="mt-1 text-sm text-ink-muted">
                {t('today.doneCount', { count: view.doneToday.length })}
              </p>
            )}
          </div>
          {props.meter && (
            <div id="weekly-meter" className="flex flex-col items-center gap-1">
              <ProgressRing
                value={props.meter.value}
                max={props.meter.target}
                size={88}
                stroke={9}
                tone={meterDone ? 'success' : 'primary'}
                label={t('meter.name')}
                valueText={t('today.meterBody', {
                  value: props.meter.value,
                  target: props.meter.target,
                })}
              >
                <span className="font-num text-lg font-bold leading-none">
                  {Math.min(
                    100,
                    Math.round((props.meter.value / Math.max(1, props.meter.target)) * 100),
                  )}
                  %
                </span>
              </ProgressRing>
              <span className="text-xs font-bold text-ink-muted">{t('meter.name')}</span>
            </div>
          )}
        </div>
      </header>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
        {props.onFilter && (
          <div
            className="flex shrink-0 rounded-full bg-surface-2 p-1"
            role="group"
            aria-label={t('today.whose')}
          >
            {(['all', 'mine'] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={(props.filter ?? 'all') === f}
                onClick={() => props.onFilter?.(f)}
                className={cn(
                  'min-h-[36px] rounded-full px-3 text-sm font-bold',
                  (props.filter ?? 'all') === f
                    ? 'bg-surface text-ink shadow-card'
                    : 'text-ink-muted',
                )}
              >
                {f === 'all' ? t('today.filterAll') : t('today.filterMine')}
              </button>
            ))}
          </div>
        )}
        {props.onUpcoming && (
          <ActionChip icon="calendar" label={t('upcoming.title')} onClick={props.onUpcoming} />
        )}
        {props.onCatchUp && (
          <ActionChip
            icon="history"
            label={t('today.catchUpShort')}
            onClick={props.onCatchUp}
            badge={props.catchUpCount}
          />
        )}
        {props.onLogFix && (
          <ActionChip icon="wrench" label={t('deed.logFix')} onClick={props.onLogFix} />
        )}
      </div>

      {props.zoneNames.length > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-sm font-bold text-on-secondary">
          <Icon name="pin" size={16} />
          {t('today.zone', { zone: props.zoneNames.join(', ') })}
        </p>
      )}
      {props.tips && <div className="mt-3 flex flex-col gap-2">{props.tips}</div>}

      {groups.map((g) => (
        <section
          key={g.room?.id ?? 'anywhere'}
          aria-label={g.room?.name ?? t('today.anywhere')}
          className="mt-5"
        >
          <h2 className="mb-2 flex items-center gap-2 px-1 text-base">
            <RoomTile room={g.room} size={28} />
            <span className="min-w-0 flex-1 truncate">{g.room?.name ?? t('today.anywhere')}</span>
            <span className="font-num text-sm text-ink-muted">{g.items.length}</span>
          </h2>
          <ul className="flex flex-col gap-2">{g.items.map((i) => row(i, { grouped: true }))}</ul>
        </section>
      ))}

      {view.waiting.length > 0 && (
        <section aria-labelledby="waiting-heading" className="mt-6">
          <h2 id="waiting-heading" className="mb-2 flex items-center gap-2 px-1 text-base">
            <span
              className="grid h-7 w-7 place-items-center rounded-theme-sm bg-accent text-on-accent"
              aria-hidden
            >
              <Icon name="clock" size={16} />
            </span>
            <span className="flex-1">{t('today.waitingHeading')}</span>
            {view.waitingMore.length > 0 && props.onToggleWaiting && (
              <button
                type="button"
                onClick={props.onToggleWaiting}
                className="min-h-[36px] px-1 text-sm font-bold underline underline-offset-2"
              >
                {props.showAllWaiting
                  ? t('common.showLess')
                  : t('common.showMore', { count: view.waitingMore.length })}
              </button>
            )}
          </h2>
          <ul className="flex flex-col gap-2">{waiting.map((i) => row(i))}</ul>
        </section>
      )}

      {view.ifNeeded.length > 0 && (
        <section aria-labelledby="if-needed-heading" className="mt-6">
          <h2 id="if-needed-heading" className="flex items-center gap-2 px-1 text-base">
            <span
              className="grid h-7 w-7 place-items-center rounded-theme-sm bg-surface-2"
              aria-hidden
            >
              <Icon name="sparkle" size={16} />
            </span>
            {t('today.ifNeededHeading')}
          </h2>
          <p className="mb-2 px-1 text-sm text-ink-muted">{t('today.ifNeededBody')}</p>
          <ul className="flex flex-col gap-2">
            {view.ifNeeded.map((i) => row(i, { optional: true }))}
          </ul>
        </section>
      )}

      {left === 0 && view.ifNeeded.length === 0 && (
        <EmptyState icon="sparkle" title={t('today.allClear')} body={t('today.allClearBody')} />
      )}

      {view.doneToday.length > 0 && (
        <section aria-labelledby="done-heading" className="mt-6">
          <h2 id="done-heading">
            <button
              type="button"
              aria-expanded={showDone}
              onClick={() => setShowDone((v) => !v)}
              className="flex min-h-[44px] w-full items-center gap-2 px-1 text-left text-base"
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-theme-sm bg-success text-on-success"
                aria-hidden
              >
                <Icon name="check" size={16} strokeWidth={3} />
              </span>
              <span className="flex-1">
                {t('today.doneHeading')} · {view.doneToday.length}
              </span>
              <Icon
                name="down"
                size={18}
                className={cn('transition-transform', showDone && 'rotate-180')}
              />
            </button>
          </h2>
          {showDone && (
            <ul className="mt-2 flex flex-col gap-2">
              {view.doneToday.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  state="done"
                  today={today}
                  location={props.locationName(task.location_id)}
                  doneBy={props.doneByFor?.(task.id)}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
