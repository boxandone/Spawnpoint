import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Avatar, EmptyState, PageHeader, Select, Splash, Tag, TextField } from '@/components/ui';
import { addDays, diffDays, mediumDate, weekdayName, weekdayOf } from '@/lib/dates';
import { useChores, useHistory } from '@/modules/chores/hooks';
import { useHousehold } from '@/modules/households/context';
import { listAreas, locationLabel } from '@/modules/locations/logic';
import { qk } from '@/lib/queryKeys';
import type { ChoreCompletion } from '@/modules/chores/types';
import { listFixLogs } from '@/modules/rewards/api';
import { getDeed } from '@/modules/rewards/deeds';
import { useCopy } from '@/theme';

/** Who did what, as plain entries. Never counts per person. */
export function HistoryPage() {
  const t = useCopy();
  const { today, memberById, household } = useHousehold();
  const { tasks, locations, ancestry } = useChores();
  const [from, setFrom] = useState(addDays(today, -13));
  const [to, setTo] = useState(today);
  const [area, setArea] = useState('');
  const { data, isLoading } = useHistory(from, to);
  // "Log a fix" entries (task-linked deeds already appear as their task).
  const fixes = useQuery({
    queryKey: [...qk.deedLogs(household.id), from, to],
    queryFn: () => listFixLogs(household.id, from, to),
  });
  const areas = useMemo(() => listAreas(locations), [locations]);
  const taskById = useMemo(() => new Map(tasks.map((x) => [x.id, x])), [tasks]);

  const entries = useMemo(
    () =>
      [
        ...(data ?? []),
        ...(fixes.data ?? []).map((f): ChoreCompletion & { deedName?: string } => ({
          id: f.id,
          task_id: '',
          done_on: f.day,
          kind: 'done',
          done_by: f.member_id,
          logged_by: f.logged_by,
          quantity: getDeed(f.deed_key) && 'unit' in getDeed(f.deed_key)! ? f.quantity : null,
          note: null,
          logged_at: null,
          source: null,
          deedName: getDeed(f.deed_key)?.name ?? f.deed_key,
        })),
      ]
        .sort((a, b) => b.done_on.localeCompare(a.done_on))
        .filter((c: ChoreCompletion & { deedName?: string }) => {
          if (c.deedName) return !area;
          if (!area) return true;
          const task = taskById.get(c.task_id);
          return !!task?.location_id && ancestry(task.location_id).includes(area);
        }),
    [data, fixes.data, area, taskById, ancestry],
  );

  const byDay = new Map<string, typeof entries>();
  for (const e of entries) byDay.set(e.done_on, [...(byDay.get(e.done_on) ?? []), e]);

  return (
    <div>
      <PageHeader title={t('history.title')} back />
      <div className="grid grid-cols-2 gap-3">
        <Select
          label={t('area.singular')}
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="col-span-2"
        >
          <option value="">{t('history.allAreas')}</option>
          {areas.map(({ area: a, zone }) => (
            <option key={a.id} value={a.id}>
              {zone ? `${zone.name} › ${a.name}` : a.name}
            </option>
          ))}
        </Select>
        <TextField
          label={t('history.from')}
          type="date"
          value={from}
          max={to}
          onChange={(e) => e.target.value && setFrom(e.target.value)}
        />
        <TextField
          label={t('history.to')}
          type="date"
          value={to}
          min={from}
          max={today}
          onChange={(e) => e.target.value && setTo(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Splash />
      ) : entries.length === 0 ? (
        <EmptyState icon="history" title={t('history.empty')} />
      ) : (
        <ol className="mt-4 flex flex-col gap-4">
          {[...byDay.entries()].map(([day, list]) => (
            <li key={day}>
              <h2 className="mb-2 px-1 text-sm text-ink-muted">
                {diffDays(today, day) === 0
                  ? t('day.today')
                  : diffDays(today, day) === 1
                    ? t('day.yesterday')
                    : `${weekdayName(weekdayOf(day))} · ${mediumDate(day, today)}`}
              </h2>
              <ul className="sp-panel divide-y divide-line">
                {list.map((c) => {
                  const who = memberById(c.done_by);
                  const logger =
                    c.logged_by && c.logged_by !== c.done_by ? memberById(c.logged_by) : undefined;
                  const task = taskById.get(c.task_id);
                  return (
                    <li key={c.id} className="flex items-start gap-3 px-3 py-3">
                      {who && (
                        <Avatar
                          avatar={who.avatar}
                          color={who.color}
                          name={who.display_name}
                          size={32}
                          decorative
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold leading-snug">
                          {t('history.entry', {
                            name: who?.display_name ?? '?',
                            task: (c as { deedName?: string }).deedName ?? task?.title ?? '…',
                          })}
                        </p>
                        <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
                          {locationLabel(task?.location_id ?? null, locations)}
                          {c.kind === 'skipped' && <Tag>{t('history.skipped')}</Tag>}
                          {c.quantity && task?.unit && (
                            <span>
                              {c.quantity} {task.unit}
                            </span>
                          )}
                          {logger && (
                            <span>{t('history.loggedBy', { name: logger.display_name })}</span>
                          )}
                        </p>
                        {c.note && <p className="mt-1 text-sm">“{c.note}”</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
