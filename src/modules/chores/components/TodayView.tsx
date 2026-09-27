import { Button, EmptyState, Icon, IconButton, Panel, SectionTitle } from '@/components/ui';
import { Chip } from '@/components/ui/Chip';
import type { IsoDate } from '@/lib/dates';
import type { Member } from '@/modules/households/types';
import { useCopy } from '@/theme';
import type { TodayItem, TodayView as TodayData } from '../logic';
import type { ChoreTask } from '../types';
import { TaskRow } from './TaskRow';
import { WeeklyMeter } from './WeeklyMeter';

export interface TodayViewProps {
  name: string;
  hour: number;
  today: IsoDate;
  view: TodayData<ChoreTask>;
  meter: { value: number; target: number };
  zoneNames: string[];
  catchUpCount: number;
  locationName: (id: string | null) => string | null;
  memberById: (id: string | null | undefined) => Member | undefined;
  doneByFor?: (taskId: string) => Member | undefined;
  filter?: 'all' | 'mine';
  onFilter?: (f: 'all' | 'mine') => void;
  showAllWaiting?: boolean;
  onToggleWaiting?: () => void;
  onDone?: (task: ChoreTask, el: HTMLElement) => void;
  onMore?: (task: ChoreTask) => void;
  onAdd?: () => void;
  onCatchUp?: () => void;
  onUpcoming?: () => void;
}

/**
 * The Today screen body. Pure presentation, so the theme gallery can render the
 * exact same component with preview data.
 */
export function TodayView(props: TodayViewProps) {
  const t = useCopy();
  const { view, today } = props;
  const greetingKey =
    props.hour < 12
      ? 'today.greeting.morning'
      : props.hour < 18
        ? 'today.greeting.afternoon'
        : 'today.greeting.evening';
  const waiting = props.showAllWaiting ? [...view.waiting, ...view.waitingMore] : view.waiting;
  const nothingOpen = view.due.length === 0 && view.waiting.length === 0;

  const row = (item: TodayItem<ChoreTask>) => (
    <TaskRow
      key={item.task.id}
      task={item.task}
      state={item.status.kind}
      today={today}
      waitingSince={item.status.kind === 'waiting' ? item.status.occurrence.date : undefined}
      windowed={item.status.occurrence.dueBy !== item.status.occurrence.date}
      location={props.locationName(item.task.location_id)}
      assignee={props.memberById(item.task.assignee_id)}
      onDone={props.onDone ? (el) => props.onDone?.(item.task, el) : undefined}
      onMore={props.onMore ? () => props.onMore?.(item.task) : undefined}
    />
  );

  return (
    <div>
      <header className="flex items-start gap-2 pb-3 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-muted">{t(greetingKey)}</p>
          <h1 className="truncate text-3xl leading-tight">{t('app.today')}</h1>
          {props.name && <p className="sr-only">{props.name}</p>}
        </div>
        {props.onAdd && (
          <IconButton
            icon="plus"
            label={t('today.addTask')}
            onClick={props.onAdd}
            className="bg-surface shadow-card"
          />
        )}
      </header>

      <WeeklyMeter value={props.meter.value} target={props.meter.target} />

      {(props.zoneNames.length > 0 || props.onFilter) && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {props.zoneNames.length > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-sm font-bold text-on-secondary">
              <Icon name="pin" size={16} />
              {t('today.zone', { zone: props.zoneNames.join(', ') })}
            </span>
          )}
          {props.onFilter && (
            <>
              <Chip selected={props.filter !== 'mine'} onClick={() => props.onFilter?.('all')}>
                {t('today.filterAll')}
              </Chip>
              <Chip selected={props.filter === 'mine'} onClick={() => props.onFilter?.('mine')}>
                {t('today.filterMine')}
              </Chip>
            </>
          )}
        </div>
      )}

      {view.due.length > 0 && (
        <section aria-labelledby="due-heading">
          <SectionTitle id="due-heading">
            {t('today.dueHeading')} · {view.due.length}
          </SectionTitle>
          <ul className="flex flex-col gap-2">{view.due.map(row)}</ul>
        </section>
      )}

      {view.waiting.length > 0 && (
        <section aria-labelledby="waiting-heading">
          <SectionTitle
            id="waiting-heading"
            action={
              view.waitingMore.length > 0 && props.onToggleWaiting ? (
                <button
                  type="button"
                  onClick={props.onToggleWaiting}
                  className="min-h-[36px] px-1 text-sm font-bold text-ink underline underline-offset-2"
                >
                  {props.showAllWaiting
                    ? t('common.showLess')
                    : t('common.showMore', { count: view.waitingMore.length })}
                </button>
              ) : undefined
            }
          >
            {t('today.waitingHeading')}
          </SectionTitle>
          <ul className="flex flex-col gap-2">{waiting.map(row)}</ul>
        </section>
      )}

      {nothingOpen && (
        <Panel className="mt-4">
          <EmptyState
            icon="sparkle"
            title={t('today.allClear')}
            body={t('today.allClearBody')}
            action={
              props.onUpcoming && (
                <Button variant="secondary" icon="calendar" onClick={props.onUpcoming}>
                  {t('upcoming.title')}
                </Button>
              )
            }
          />
        </Panel>
      )}

      {props.catchUpCount > 0 && props.onCatchUp && (
        <button
          type="button"
          onClick={props.onCatchUp}
          className="sp-panel mt-4 flex w-full items-center gap-3 p-4 text-left"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
            <Icon name="history" size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display">{t('today.catchUp')}</span>
            <span className="block text-sm text-ink-muted">{t('today.catchUpHint')}</span>
          </span>
          <Icon name="chevron" size={20} className="text-ink-muted" />
        </button>
      )}

      {view.doneToday.length > 0 && (
        <section aria-labelledby="done-heading">
          <SectionTitle id="done-heading">
            {t('common.done')} · {view.doneToday.length}
          </SectionTitle>
          <ul className="flex flex-col gap-2">
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
        </section>
      )}
    </div>
  );
}
