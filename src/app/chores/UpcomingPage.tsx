import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Splash } from '@/components/ui';
import { diffDays, mediumDate, weekdayName, weekdayOf } from '@/lib/dates';
import { useChores } from '@/modules/chores/hooks';
import { upcoming } from '@/modules/chores/logic';
import { useHousehold } from '@/modules/households/context';
import { locationLabel } from '@/modules/locations/logic';
import { Avatar } from '@/components/ui';
import { EffortIcon, useCopy } from '@/theme';

/** The next 7 days. */
export function UpcomingPage() {
  const t = useCopy();
  const { memberById } = useHousehold();
  const { tasks, completions, locations, ctx, today, isLoading } = useChores();
  const days = useMemo(
    () => upcoming(tasks, completions, today, ctx),
    [tasks, completions, today, ctx],
  );
  if (isLoading) return <Splash />;

  return (
    <div>
      <PageHeader title={t('upcoming.title')} subtitle={t('upcoming.body')} back />
      <ol className="flex flex-col gap-4">
        {days.map((d) => (
          <li key={d.date}>
            <h2 className="mb-2 px-1 text-sm text-ink-muted">
              {diffDays(d.date, today) === 1
                ? t('day.tomorrow')
                : weekdayName(weekdayOf(d.date), true)}{' '}
              · {mediumDate(d.date, today)}
            </h2>
            {d.tasks.length === 0 ? (
              <p className="px-1 text-sm text-ink-muted">{t('upcoming.nothing')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {d.tasks.map((task) => {
                  const who = memberById(task.assignee_id);
                  return (
                    <li key={task.id}>
                      <Link
                        to={`/tasks/${task.id}`}
                        className="sp-panel flex min-h-[56px] items-center gap-3 px-3 py-2"
                      >
                        <EffortIcon level={task.effort} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">{task.title}</span>
                          <span className="block truncate text-[13px] text-ink-muted">
                            {locationLabel(task.location_id, locations)}
                          </span>
                        </span>
                        {who && (
                          <Avatar
                            avatar={who.avatar}
                            color={who.color}
                            name={who.display_name}
                            size={28}
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
