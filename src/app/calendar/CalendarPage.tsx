import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  PageHeader,
  Panel,
  SectionTitle,
  Segmented,
  Sheet,
  Splash,
  Tag,
  useToast,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  addDays,
  dateRange,
  endOfMonth,
  makeDate,
  monthName,
  monthOf,
  shortDay,
  startOfMonth,
  weekBounds,
  weekdayName,
  weekdayOf,
  yearOf,
  type IsoDate,
} from '@/lib/dates';
import { qk } from '@/lib/queryKeys';
import { buildEvents, eventsOn, type CalEvent, type ChoresMode } from '@/modules/calendar/events';
import { useChores } from '@/modules/chores/hooks';
import { useHousehold } from '@/modules/households/context';
import { useListItems, useLists } from '@/modules/lists/hooks';
import * as plansApi from '@/modules/plans/api';
import { useIcsToken, usePlans } from '@/modules/plans/hooks';
import { useCopy, type CopyKey } from '@/theme';

const MODE_KEY = 'sp.calendar.chores';
const KIND_DOT: Record<CalEvent['kind'], string> = {
  plan: 'bg-primary',
  todo: 'bg-accent',
  chore: 'bg-secondary',
};

function readMode(): ChoresMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === 'none' || v === 'fixed' ? v : 'high';
  } catch {
    return 'high';
  }
}

/** Month and agenda views of plans, to-dos with due dates, and chores. */
export function CalendarPage() {
  const t = useCopy();
  const { today, settings } = useHousehold();
  const plans = usePlans();
  const lists = useLists();
  const listItems = useListItems();
  const { tasks, locations, isLoading } = useChores();
  const [month, setMonth] = useState<IsoDate>(startOfMonth(today));
  const [selected, setSelected] = useState<IsoDate>(today);
  const [chores, setChoresState] = useState<ChoresMode>(readMode);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const setChores = (m: ChoresMode) => {
    setChoresState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* per-device only */
    }
  };

  const gridStart = weekBounds(month).start;
  const gridEnd = weekBounds(endOfMonth(month)).end;
  const agendaEnd = addDays(selected, 30);
  const events = useMemo(() => {
    const todoList = lists.data?.find((l) => l.kind === 'todo');
    return buildEvents(
      {
        plans: plans.data ?? [],
        todos: (listItems.data ?? [])
          .filter((i) => i.list_id === todoList?.id && !i.checked)
          .map((i) => ({ id: i.id, title: i.name, due_on: i.due_on })),
        tasks,
        rotation: settings.zone_rotation,
        locations,
      },
      gridStart < selected ? gridStart : selected,
      gridEnd > agendaEnd ? gridEnd : agendaEnd,
      chores,
    );
  }, [
    plans.data,
    lists.data,
    listItems.data,
    tasks,
    locations,
    settings.zone_rotation,
    gridStart,
    gridEnd,
    selected,
    agendaEnd,
    chores,
  ]);

  if (plans.isLoading || isLoading) return <Splash />;

  const shift = (n: number) => {
    const m = monthOf(month) + n;
    const y = yearOf(month) + Math.floor((m - 1) / 12);
    setMonth(makeDate(y, ((m - 1 + 1200) % 12) + 1, 1));
  };
  // Multi-day plans appear once: on their first day, or on the selected day if already under way.
  const agendaDays = dateRange(selected, agendaEnd)
    .map((d) => ({
      d,
      items: eventsOn(events, d).filter((e) => e.start === d || d === selected),
    }))
    .filter((x) => x.items.length > 0);

  return (
    <div className="pb-8">
      <PageHeader
        title={t('calendar.title')}
        back
        action={
          <Button size="sm" variant="secondary" icon="link" onClick={() => setSubscribeOpen(true)}>
            {t('calendar.subscribe')}
          </Button>
        }
      />

      <Panel>
        <div className="mb-2 flex items-center justify-between">
          <IconButton icon="back" label={t('calendar.prev')} onClick={() => shift(-1)} />
          <p className="font-display text-lg font-bold" aria-live="polite">
            {monthName(monthOf(month), true)} {yearOf(month)}
          </p>
          <IconButton icon="chevron" label={t('calendar.next')} onClick={() => shift(1)} />
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-bold text-ink-muted" aria-hidden>
          {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
            <span key={wd} className="py-1">
              {weekdayName(wd).slice(0, 2)}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1" role="grid" aria-label={t('calendar.title')}>
          {dateRange(gridStart, gridEnd).map((d) => {
            const inMonth = monthOf(d) === monthOf(month);
            const dayEvents = eventsOn(events, d);
            const kinds = [...new Set(dayEvents.map((e) => e.kind))];
            return (
              <button
                key={d}
                type="button"
                role="gridcell"
                aria-selected={d === selected}
                aria-label={`${shortDay(d, today)} ${d.slice(8)}: ${t('calendar.count', { count: dayEvents.length })}`}
                onClick={() => setSelected(d)}
                className={cn(
                  'flex aspect-square flex-col items-center justify-start rounded-theme-sm pt-1 text-sm',
                  !inMonth && 'text-ink-muted opacity-60',
                  d === selected ? 'bg-primary text-primary-ink' : 'hover:bg-surface-2',
                  d === today &&
                    d !== selected &&
                    'font-bold shadow-[inset_0_0_0_2px_var(--primary)]',
                )}
              >
                <span className="font-num">{Number(d.slice(8))}</span>
                <span className="mt-0.5 flex gap-0.5" aria-hidden>
                  {kinds.map((k) => (
                    <span
                      key={k}
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        d === selected ? 'bg-primary-ink' : KIND_DOT[k],
                      )}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-muted" aria-hidden>
          {(['plan', 'todo', 'chore'] as const).map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span className={cn('h-2 w-2 rounded-full', KIND_DOT[k])} />
              {t(`calendar.kind.${k}` as CopyKey)}
            </span>
          ))}
        </div>
      </Panel>

      <Segmented
        label={t('calendar.chores')}
        value={chores}
        onChange={setChores}
        options={[
          { value: 'none', label: t('calendar.chores.none') },
          { value: 'high', label: t('calendar.chores.high') },
          { value: 'fixed', label: t('calendar.chores.fixed') },
        ]}
        className="mt-3"
      />

      <SectionTitle>{t('calendar.agenda')}</SectionTitle>
      {agendaDays.length === 0 ? (
        <EmptyState icon="calendar" title={t('calendar.empty')} />
      ) : (
        <div className="flex flex-col gap-3">
          {agendaDays.map(({ d, items }) => (
            <section key={d} aria-labelledby={`day-${d}`}>
              <h3 id={`day-${d}`} className="mb-1 px-1 text-sm font-bold text-ink-muted">
                {d === today ? t('day.today') : weekdayName(weekdayOf(d))} · {monthName(monthOf(d))}{' '}
                {Number(d.slice(8))}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {items.map((e) => (
                  <li key={`${e.uid}-${d}`}>
                    <Link
                      to={e.path}
                      className="sp-panel flex min-h-[48px] items-center gap-3 px-3 py-2"
                    >
                      <span
                        className={cn('h-2.5 w-2.5 shrink-0 rounded-full', KIND_DOT[e.kind])}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate font-bold">{e.title}</span>
                      {e.tentative && <Tag>{t('plans.tentativeShort')}</Tag>}
                      <span className="text-xs text-ink-muted">
                        {t(`calendar.kind.${e.kind}` as CopyKey)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <SubscribeSheet open={subscribeOpen} onClose={() => setSubscribeOpen(false)} />
    </div>
  );
}

/** A private feed link for Google Calendar or any calendar app. */
function SubscribeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useCopy();
  const toast = useToast();
  const qc = useQueryClient();
  const { member, today } = useHousehold();
  const token = useIcsToken();
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: qk.icsToken(member.id) });
  const link = fresh ? plansApi.feedUrl(window.location.origin, fresh) : null;

  const make = async () => {
    setBusy(true);
    try {
      setFresh(await plansApi.createIcsToken());
      await refresh();
    } catch {
      toast.show({ message: t('common.error'), tone: 'danger' });
    }
    setBusy(false);
  };
  const turnOff = async () => {
    await plansApi.revokeIcsToken().catch(() => undefined);
    setFresh(null);
    await refresh();
    toast.show({ message: t('calendar.feedOff') });
  };
  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.show({ message: t('common.copied'), tone: 'success' });
    } catch {
      /* the field is selectable as a fallback */
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('calendar.subscribeTitle')}
      description={t('calendar.subscribeBody')}
    >
      <div className="flex flex-col gap-4">
        {link ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="px-0.5 text-sm font-bold">{t('calendar.yourLink')}</span>
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className="sp-input min-h-[48px] w-full font-mono text-xs"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button icon="copy" onClick={() => void copy()}>
                {t('common.copy')}
              </Button>
              <a
                href={link.replace(/^https?:/, 'webcal:')}
                className="sp-btn sp-btn-secondary inline-flex items-center justify-center"
              >
                {t('calendar.openInApp')}
              </a>
            </div>
            <p className="text-sm text-ink-muted">{t('calendar.copyOnce')}</p>
          </>
        ) : token.data ? (
          <p className="text-sm">
            {token.data.last_used_at
              ? t('calendar.activeUsed', {
                  day: shortDay(token.data.last_used_at.slice(0, 10), today),
                })
              : t('calendar.active')}
          </p>
        ) : null}

        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>{t('calendar.step1')}</li>
          <li>
            {t('calendar.step2')}{' '}
            <a
              href="https://calendar.google.com/calendar/r/settings/addbyurl"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline underline-offset-2"
            >
              {t('calendar.step2Link')}
            </a>
          </li>
          <li>{t('calendar.step3')}</li>
        </ol>
        <p className="rounded-theme bg-surface-2 p-3 text-sm">{t('calendar.refreshNote')}</p>

        {token.data && (
          <Segmented
            label={t('calendar.feedChores')}
            value={token.data.chores as ChoresMode}
            onChange={(m) => void plansApi.setIcsChores(m).then(refresh)}
            options={[
              { value: 'none', label: t('calendar.chores.none') },
              { value: 'high', label: t('calendar.chores.high') },
              { value: 'fixed', label: t('calendar.chores.fixed') },
            ]}
          />
        )}

        <p className="flex gap-2 text-sm text-ink-muted">
          <Icon name="shield" size={18} className="shrink-0" />
          {t('calendar.privacy')}
        </p>
        <div className="flex flex-col gap-2">
          <Button
            loading={busy}
            onClick={() => void make()}
            variant={token.data ? 'secondary' : 'primary'}
          >
            {token.data ? t('calendar.newLink') : t('calendar.makeLink')}
          </Button>
          {token.data && (
            <Button variant="ghost" onClick={() => void turnOff()}>
              {t('calendar.turnOff')}
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
