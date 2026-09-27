import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, EmptyState, Icon, PageHeader, Panel, Splash } from '@/components/ui';
import { cn } from '@/lib/cn';
import { diffDays, shortDay } from '@/lib/dates';
import { newId } from '@/modules/chores/api';
import { useChores, useLogCompletions } from '@/modules/chores/hooks';
import { catchUp } from '@/modules/chores/logic';
import { useHousehold } from '@/modules/households/context';
import { locationLabel } from '@/modules/locations/logic';
import { EffortIcon, useCopy } from '@/theme';

/** "What got done?" Tick things from the last week, pick a day for each, log them all at once. */
export function CatchUpPage() {
  const t = useCopy();
  const navigate = useNavigate();
  const { member, today } = useHousehold();
  const { tasks, completions, locations, ctx, isLoading } = useChores();
  const log = useLogCompletions();
  const rows = useMemo(
    () => catchUp(tasks, completions, today, ctx),
    [tasks, completions, today, ctx],
  );
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [chosenDay, setChosenDay] = useState<Record<string, string>>({});

  if (isLoading) return <Splash />;

  const count = Object.keys(picked).length;
  const dayLabel = (d: string) => {
    const ago = diffDays(today, d);
    return ago === 0 ? t('day.today') : ago === 1 ? t('day.yesterday') : shortDay(d, today);
  };

  const submit = () => {
    const sessionId = newId();
    log(
      Object.entries(picked).map(([taskId, day]) => ({
        taskId,
        doneOn: day,
        doneBy: member.id,
        source: 'catch_up' as const,
        catchUpId: sessionId,
      })),
      { message: t('catchUp.submitted', { count }) },
    );
    navigate('/');
  };

  return (
    <div>
      <PageHeader title={t('catchUp.title')} subtitle={t('catchUp.body')} back="/" />
      {rows.length === 0 ? (
        <Panel className="mt-4">
          <EmptyState icon="sparkle" title={t('catchUp.empty')} />
        </Panel>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {rows.map((row) => {
            const isPicked = row.task.id in picked;
            const day = chosenDay[row.task.id] ?? row.defaultDay;
            return (
              <li
                key={row.task.id}
                className={cn('sp-panel p-3 transition-shadow', isPicked && 'ring-2 ring-primary')}
              >
                <button
                  type="button"
                  aria-pressed={isPicked}
                  onClick={() =>
                    setPicked((p) => {
                      const next = { ...p };
                      if (isPicked) delete next[row.task.id];
                      else next[row.task.id] = day;
                      return next;
                    })
                  }
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-theme-sm',
                      isPicked
                        ? 'bg-primary text-primary-ink'
                        : 'shadow-[inset_0_0_0_2.5px_var(--line)]',
                    )}
                  >
                    {isPicked && <Icon name="check" size={20} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{row.task.title}</span>
                    <span className="flex items-center gap-2 text-[13px] text-ink-muted">
                      <EffortIcon level={row.task.effort} />
                      {locationLabel(row.task.location_id, locations)}
                      <span>
                        ·{' '}
                        {t('catchUp.since', {
                          day: shortDay(row.missed[row.missed.length - 1] as string, today),
                        })}
                      </span>
                    </span>
                  </span>
                </button>
                <div
                  className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none"
                  role="group"
                  aria-label={t('task.doneWhen')}
                >
                  {row.days.map((d) => (
                    <Chip
                      key={d}
                      selected={isPicked && day === d}
                      onClick={() => {
                        setChosenDay((c) => ({ ...c, [row.task.id]: d }));
                        setPicked((p) => ({ ...p, [row.task.id]: d }));
                      }}
                      className="min-h-[36px] px-3"
                    >
                      {dayLabel(d)}
                    </Chip>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {rows.length > 0 && (
        <div className="sticky bottom-[calc(80px+env(safe-area-inset-bottom))] mt-4">
          <Button block size="lg" icon="check" disabled={count === 0} onClick={submit}>
            {t('catchUp.submit', { count })}
          </Button>
        </div>
      )}
    </div>
  );
}
