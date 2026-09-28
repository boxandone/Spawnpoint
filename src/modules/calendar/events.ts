/**
 * What goes on the calendar, shared by the in-app Calendar and the ICS feed:
 * dated plans, to-dos with due dates, and chores on fixed days (all of them,
 * high priority only, or none). Pure, with relative imports only so the
 * Netlify function can bundle it.
 */
import { addDays, type IsoDate } from '../../lib/dates';
import {
  effectiveSchedule,
  isFloating,
  occurrencesBetween,
  type ZoneRotation,
} from '../chores/logic';
import { makeAncestry } from '../locations/logic';
import { parseSchedule } from '../chores/schedule';

export type ChoresMode = 'none' | 'high' | 'fixed';

export interface CalEvent {
  /** Stable across feed refreshes, so calendars update instead of duplicating. */
  uid: string;
  kind: 'plan' | 'todo' | 'chore';
  title: string;
  start: IsoDate;
  /** Last day, inclusive. */
  end: IsoDate;
  tentative: boolean;
  /** The app page it opens. */
  path: string;
}

export interface CalendarSource {
  plans: Array<{
    id: string;
    title: string;
    starts_on: string | null;
    ends_on: string | null;
    tentative: boolean;
    status?: string;
    archived_at?: string | null;
  }>;
  todos: Array<{ id: string; title: string; due_on: string | null }>;
  tasks: Array<{
    id: string;
    title: string;
    schedule: unknown;
    priority: string;
    start_on: string | null;
    location_id: string | null;
    if_missed?: string;
    archived_at?: string | null;
  }>;
  rotation?: ZoneRotation;
  locations?: Array<{ id: string; parent_id: string | null }>;
}

export function buildEvents(
  src: CalendarSource,
  from: IsoDate,
  to: IsoDate,
  chores: ChoresMode,
  /** Chores can use a shorter window than plans (daily chores add up fast). */
  choresWindow: { from: IsoDate; to: IsoDate } = { from, to },
): CalEvent[] {
  const out: CalEvent[] = [];
  for (const p of src.plans) {
    if (!p.starts_on || p.archived_at) continue;
    const end = p.ends_on ?? p.starts_on;
    if (end < from || p.starts_on > to) continue;
    out.push({
      uid: `plan-${p.id}`,
      kind: 'plan',
      title: p.title,
      start: p.starts_on,
      end,
      tentative: p.tentative,
      path: `/plans/${p.id}`,
    });
  }
  for (const t of src.todos) {
    if (!t.due_on || t.due_on < from || t.due_on > to) continue;
    out.push({
      uid: `todo-${t.id}`,
      kind: 'todo',
      title: t.title,
      start: t.due_on,
      end: t.due_on,
      tentative: false,
      path: '/lists',
    });
  }
  if (chores !== 'none') {
    const ancestry = makeAncestry(
      (src.locations ?? []).map((l) => ({ ...l, kind: 'area' as const, name: '', sort: 0 })),
    );
    for (const task of src.tasks) {
      if (task.archived_at || task.if_missed === 'if_needed') continue;
      if (chores === 'high' && task.priority !== 'high') continue;
      const s = effectiveSchedule(
        { schedule: parseSchedule(task.schedule), location_id: task.location_id },
        { rotation: src.rotation, ancestry },
      );
      // Floating schedules move with each completion, so they have no fixed day to show.
      if (isFloating(s)) continue;
      for (const occ of occurrencesBetween(
        s,
        choresWindow.from,
        choresWindow.to,
        task.start_on ?? choresWindow.from,
      )) {
        out.push({
          uid: `chore-${task.id}-${occ.date}`,
          kind: 'chore',
          title: task.title,
          start: occ.date,
          end: occ.dueBy,
          tentative: false,
          path: '/',
        });
      }
    }
  }
  return out.sort(
    (a, b) =>
      a.start.localeCompare(b.start) ||
      a.kind.localeCompare(b.kind) ||
      a.title.localeCompare(b.title),
  );
}

/** Events touching a day, for the month grid and agenda. */
export function eventsOn(events: readonly CalEvent[], day: IsoDate): CalEvent[] {
  return events.filter((e) => e.start <= day && e.end >= day);
}

/** The feed: plans and to-dos from two months back to a year ahead; chores for a week back to two months ahead. */
export function feedWindow(today: IsoDate): {
  from: IsoDate;
  to: IsoDate;
  chores: { from: IsoDate; to: IsoDate };
} {
  return {
    from: addDays(today, -60),
    to: addDays(today, 365),
    chores: { from: addDays(today, -7), to: addDays(today, 60) },
  };
}
