import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  EmptyState,
  Icon,
  PageHeader,
  Panel,
  ProgressMeter,
  SectionTitle,
  Splash,
} from '@/components/ui';
import { shortDay } from '@/lib/dates';
import { useChores } from '@/modules/chores/hooks';
import { describeSchedule } from '@/modules/chores/schedule';
import { freshness, isStale, nextDue, tasksUnder } from '@/modules/chores/logic';
import { listAreas, locationLabel } from '@/modules/locations/logic';
import { EffortIcon, useCopy } from '@/theme';
import { MEMBER_INK } from '@/theme/memberColors';
import { roomColor, roomIcon } from '@/modules/locations/rooms';
import { Tip } from '../help/Tip';
import { PlaceStuff } from '../stuff/PlaceStuff';
import { useHousehold } from '@/modules/households/context';

function FreshnessBar({ ratio, label }: { ratio: number; label: string }) {
  const t = useCopy();
  const percent = Math.round(ratio * 100);
  return (
    <ProgressMeter
      label={label}
      value={percent}
      max={100}
      valueText={t('areas.freshPercent', { percent })}
      tone={ratio >= 0.75 ? 'success' : ratio >= 0.4 ? 'accent' : 'secondary'}
    />
  );
}

/** Every area with a freshness bar: the share of its tasks that aren't overdue. */
export function AreasPage() {
  const t = useCopy();
  const { tasks, completions, locations, ancestry, ctx, today, isLoading } = useChores();
  const areas = useMemo(() => listAreas(locations), [locations]);
  if (isLoading) return <Splash />;

  const groups = new Map<string, typeof areas>();
  for (const a of areas) {
    const key = a.zone?.name ?? '';
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }

  return (
    <div>
      <PageHeader title={t('areas.title')} back />
      <Tip id="areas" text="tip.areas" className="mb-2" />
      {areas.length === 0 && <EmptyState icon="home" title={t('areas.noTasks')} />}
      {[...groups.entries()].map(([zone, list]) => (
        <section key={zone || 'none'}>
          {zone && <SectionTitle>{zone}</SectionTitle>}
          <ul className="flex flex-col gap-2">
            {list.map(({ area }) => {
              const here = tasksUnder(tasks, area.id, ancestry).filter((x) => !x.archived_at);
              const f = freshness(here, completions, today, ctx);
              return (
                <li key={area.id}>
                  <Link to={`/areas/${area.id}`} className="sp-panel block p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-theme-sm"
                        style={{ background: roomColor(area.id), color: MEMBER_INK }}
                        aria-hidden
                      >
                        <Icon name={roomIcon(area)} size={22} />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-display text-lg">
                        {area.name}
                      </span>
                      <Icon name="chevron" size={18} className="text-ink-muted" />
                    </div>
                    {f.total > 0 ? (
                      <FreshnessBar
                        ratio={f.ratio}
                        label={`${f.total} ${f.total === 1 ? t('task.singular') : t('task.plural')}`}
                      />
                    ) : (
                      <p className="text-sm text-ink-muted">{t('areas.noTasks')}</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function AreaDetailPage() {
  const t = useCopy();
  const { settings } = useHousehold();
  const { id = '' } = useParams();
  const { tasks, completions, locations, ancestry, ctx, today, isLoading } = useChores();
  if (isLoading) return <Splash />;
  const area = locations.find((l) => l.id === id);
  if (!area) return <EmptyState icon="home" title={t('common.error')} />;
  const here = tasksUnder(tasks, area.id, ancestry)
    .filter((x) => !x.archived_at)
    .sort((a, b) => a.title.localeCompare(b.title));
  const f = freshness(here, completions, today, ctx);

  return (
    <div className="pb-8">
      <PageHeader title={area.name} subtitle={t('areas.title')} back="/areas" />
      <Panel>
        <FreshnessBar ratio={f.ratio} label={t('areas.freshness')} />
      </Panel>
      <SectionTitle>{t('areas.tasksHere')}</SectionTitle>
      {here.length === 0 ? (
        <EmptyState icon="sparkle" title={t('areas.noTasks')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {here.map((task) => {
            const next = nextDue(task, completions, today, ctx);
            const stale = isStale(task, completions, today, ctx);
            return (
              <li key={task.id}>
                <Link to={`/tasks/${task.id}`} className="sp-panel flex items-center gap-3 p-3">
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full ${stale ? 'bg-accent' : 'bg-success'}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{task.title}</span>
                    <span className="flex flex-wrap items-center gap-x-2 text-[13px] text-ink-muted">
                      <EffortIcon level={task.effort} />
                      <span>{describeSchedule(task.schedule, t)}</span>
                      {task.location_id !== area.id && (
                        <span>{locationLabel(task.location_id, locations)}</span>
                      )}
                      {next && (
                        <span>
                          ·{' '}
                          {t('task.nextDue', {
                            day: next <= today ? t('day.today') : shortDay(next, today),
                          })}
                        </span>
                      )}
                    </span>
                  </span>
                  <Icon name="chevron" size={18} className="text-ink-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {settings.modules.stuff && <PlaceStuff locationId={area.id} />}
    </div>
  );
}
