import { addDays, type IsoDate } from '@/lib/dates';
import { buildToday } from '@/modules/chores/logic';
import type { ChoreTask } from '@/modules/chores/types';
import type { TodayViewProps } from '@/modules/chores/components/TodayView';
import type { Member } from '@/modules/households/types';

/** Stand-in tasks for previews when a household has no data yet (setup wizard). */
export function sampleTasks(today: IsoDate, titles?: string[]): ChoreTask[] {
  const names =
    titles && titles.length > 0
      ? titles
      : [
          'Wipe counters, stovetop, and sink',
          'Vacuum floors and stairs',
          'Change sheets',
          'Water potted plants',
        ];
  return names.slice(0, 4).map((title, i) => ({
    id: `sample-${i}`,
    household_id: 'sample',
    title,
    notes: null,
    schedule: i === 2 ? { type: 'every_n_days', n: 10 } : { type: 'daily' },
    if_missed: i === 2 ? 'carry' : 'let_go',
    priority: 'normal',
    effort: ((i % 3) + 1) as 1 | 2 | 3,
    start_on: i === 2 ? addDays(today, -3) : addDays(today, -30),
    created_on: addDays(today, -30),
    created_at: '',
    location_id: null,
    assignee_id: null,
    deed_key: null,
    unit: null,
    library_key: null,
    archived_at: null,
  }));
}

export function previewProps(
  today: IsoDate,
  name: string,
  tasks?: ChoreTask[],
  member?: Member,
): TodayViewProps {
  const list = tasks ?? sampleTasks(today);
  return {
    name,
    hour: 9,
    today,
    view: buildToday(list, [], today),
    meter: { value: 120, target: 400 },
    zoneNames: [],
    catchUpCount: 0,
    locationName: () => null,
    memberById: (id) => (member && id === member.id ? member : undefined),
  };
}
