/**
 * Chores scheduling rules (docs/SPEC.md 4.3). Everything here is pure: no
 * clock, no timezone lookups, no I/O. Callers pass `today` as an ISO date in
 * the household timezone. UI code never computes due dates itself.
 *
 * Model
 * - Fixed schedules (daily, weekly_on, monthly_on, yearly_in) have occurrences
 *   on calendar days. yearly_in occurrences are month-long windows.
 * - A completion dated c handles the latest occurrence dated on or before c.
 * - Floating schedules (every_n_days) are due N days after the last done or
 *   skipped completion, or on start_on if never handled.
 * - No stacking: only the latest occurrence up to today is ever open.
 */
import {
  addDays,
  dateRange,
  dayOf,
  daysInMonth,
  diffDays,
  endOfMonth,
  maxDate,
  monthOf,
  weekBounds,
  weekdayOf,
  yearOf,
  type IsoDate,
} from '../../lib/dates';

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Nth = 1 | 2 | 3 | 4 | -1;

export type Schedule =
  | { type: 'daily' }
  | { type: 'every_n_days'; n: number }
  | { type: 'weekly_on'; days: Weekday[] }
  | { type: 'monthly_on'; day: number }
  | { type: 'monthly_on'; nth: Nth; weekday: Weekday }
  | { type: 'yearly_in'; months: number[] };

/** carry: stays until done. let_go: quietly moves on. if_needed: a check, done only if needed. */
export type IfMissed = 'carry' | 'let_go' | 'if_needed';
export type Priority = 'low' | 'normal' | 'high';
export type CompletionKind = 'done' | 'skipped';

export interface TaskLike {
  id: string;
  title: string;
  schedule: Schedule;
  if_missed: IfMissed;
  priority: Priority;
  effort: 1 | 2 | 3;
  /** First day the schedule applies (household timezone). */
  start_on: IsoDate;
  /** Day the task was created (household timezone); the backdating floor. */
  created_on: IsoDate;
  location_id: string | null;
  assignee_id: string | null;
  archived_at?: string | null;
}

export interface CompletionLike {
  task_id: string;
  done_on: IsoDate;
  kind: CompletionKind;
}

export interface Occurrence {
  /** First day of the occurrence. */
  date: IsoDate;
  /** Last day it's on time (same as date except for yearly_in month windows). */
  dueBy: IsoDate;
}

/** Weekday ("0"–"6") → location ids. Tasks in those locations inherit the weekday. */
export type ZoneRotation = Partial<Record<string, string[]>>;

export interface ScheduleContext {
  rotation?: ZoneRotation;
  /** Location id → [itself, parent, grandparent…]. */
  ancestry?: (locationId: string) => string[];
}

export type TaskStatus =
  | { kind: 'due'; occurrence: Occurrence; interval: number }
  | { kind: 'waiting'; occurrence: Occurrence; interval: number; daysLate: number }
  | { kind: 'handled'; occurrence: Occurrence; interval: number }
  | { kind: 'missed'; occurrence: Occurrence; interval: number }
  | { kind: 'idle'; next: Occurrence | null };

// A year and a bit: enough to find any fixed occurrence.
const LOOK = 400;

export const PRIORITY_WEIGHT: Record<Priority, number> = { low: 0.5, normal: 1, high: 2 };
export const CARRY_LIMIT = 3;
export const CATCH_UP_DAYS = 7;

// ---------------------------------------------------------------------------
// Schedules
// ---------------------------------------------------------------------------

export function isFloating(s: Schedule): s is { type: 'every_n_days'; n: number } {
  return s.type === 'every_n_days';
}

function nthWeekdayOfMonth(year: number, month: number, nth: Nth, weekday: number): number {
  const dim = daysInMonth(year, month);
  if (nth === -1) {
    const lastWeekday = new Date(Date.UTC(year, month - 1, dim)).getUTCDay();
    return dim - ((lastWeekday - weekday + 7) % 7);
  }
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((weekday - firstWeekday + 7) % 7) + (nth - 1) * 7;
}

/** Is d the first day of an occurrence of a fixed schedule? */
export function isOccurrenceDate(s: Schedule, d: IsoDate): boolean {
  switch (s.type) {
    case 'daily':
      return true;
    case 'weekly_on':
      return s.days.includes(weekdayOf(d) as Weekday);
    case 'monthly_on': {
      const y = yearOf(d);
      const m = monthOf(d);
      if ('day' in s) return dayOf(d) === Math.min(s.day, daysInMonth(y, m));
      const target = nthWeekdayOfMonth(y, m, s.nth, s.weekday);
      // A fifth weekday doesn't exist every month; nth is 1–4 or last, so target is valid.
      return dayOf(d) === target;
    }
    case 'yearly_in':
      return dayOf(d) === 1 && s.months.includes(monthOf(d));
    case 'every_n_days':
      return false;
  }
}

function occurrenceStartingOn(s: Schedule, d: IsoDate): Occurrence {
  return s.type === 'yearly_in' ? { date: d, dueBy: endOfMonth(d) } : { date: d, dueBy: d };
}

/** Latest occurrence of a fixed schedule starting on or before `date`. */
export function occurrenceOnOrBefore(
  s: Schedule,
  date: IsoDate,
  startOn: IsoDate,
): Occurrence | null {
  if (isFloating(s)) return null;
  for (let i = 0; i <= LOOK; i++) {
    const d = addDays(date, -i);
    if (d < addDays(startOn, -31)) return null;
    if (isOccurrenceDate(s, d)) {
      const occ = occurrenceStartingOn(s, d);
      return occ.dueBy >= startOn ? occ : null;
    }
  }
  return null;
}

/** Earliest occurrence of a fixed schedule starting after `date`. */
export function nextOccurrenceAfter(
  s: Schedule,
  date: IsoDate,
  startOn: IsoDate,
): Occurrence | null {
  if (isFloating(s)) return null;
  for (let i = 1; i <= LOOK; i++) {
    const d = addDays(date, i);
    if (isOccurrenceDate(s, d)) {
      const occ = occurrenceStartingOn(s, d);
      if (occ.dueBy >= startOn) return occ;
    }
  }
  return null;
}

/** Fixed occurrences whose start date falls in [from, to]. */
export function occurrencesBetween(
  s: Schedule,
  from: IsoDate,
  to: IsoDate,
  startOn: IsoDate,
): Occurrence[] {
  if (isFloating(s) || from > to) return [];
  return dateRange(from, to)
    .filter((d) => isOccurrenceDate(s, d))
    .map((d) => occurrenceStartingOn(s, d))
    .filter((o) => o.dueBy >= startOn);
}

/** Zone rotation: a weekly task in a mapped location takes the rotation's weekdays. */
export function effectiveSchedule(
  task: Pick<TaskLike, 'schedule' | 'location_id'>,
  ctx: ScheduleContext = {},
): Schedule {
  const s = task.schedule;
  if (s.type !== 'weekly_on' || !ctx.rotation || !task.location_id) return s;
  const chain = ctx.ancestry ? ctx.ancestry(task.location_id) : [task.location_id];
  const days: Weekday[] = [];
  for (let wd = 0; wd <= 6; wd++) {
    const ids = ctx.rotation[String(wd)] ?? [];
    if (ids.some((id) => chain.includes(id))) days.push(wd as Weekday);
  }
  return days.length > 0 ? { type: 'weekly_on', days } : s;
}

/** Location ids mapped to the weekday of `today`. */
export function rotationFor(rotation: ZoneRotation | undefined, today: IsoDate): string[] {
  return rotation?.[String(weekdayOf(today))] ?? [];
}

// ---------------------------------------------------------------------------
// Status of one task
// ---------------------------------------------------------------------------

function completionsFor(taskId: string, completions: CompletionLike[]): CompletionLike[] {
  return completions.filter((c) => c.task_id === taskId);
}

/** Latest done or skipped day (both restart a floating clock). */
export function lastHandledOn(taskId: string, completions: CompletionLike[]): IsoDate | null {
  let last: IsoDate | null = null;
  for (const c of completions) {
    if (c.task_id === taskId && (last === null || c.done_on > last)) last = c.done_on;
  }
  return last;
}

/** Floating due day before let-go rolling: last handled + N, or start_on. */
export function floatingAnchor(
  task: TaskLike,
  s: { n: number },
  completions: CompletionLike[],
): IsoDate {
  const last = lastHandledOn(task.id, completions);
  return last ? maxDate(addDays(last, s.n), task.start_on) : task.start_on;
}

function floatingStatus(
  task: TaskLike,
  s: { n: number },
  completions: CompletionLike[],
  today: IsoDate,
): TaskStatus {
  const anchor = floatingAnchor(task, s, completions);
  if (today < anchor) return { kind: 'idle', next: { date: anchor, dueBy: anchor } };
  if (task.if_missed === 'carry') {
    const occurrence = { date: anchor, dueBy: anchor };
    const daysLate = diffDays(today, anchor);
    return daysLate === 0
      ? { kind: 'due', occurrence, interval: s.n }
      : { kind: 'waiting', occurrence, interval: s.n, daysLate };
  }
  // Let go: a missed due day quietly rolls forward by N.
  const k = Math.floor(diffDays(today, anchor) / s.n);
  const due = addDays(anchor, k * s.n);
  if (due === today) return { kind: 'due', occurrence: { date: due, dueBy: due }, interval: s.n };
  return { kind: 'missed', occurrence: { date: due, dueBy: due }, interval: s.n };
}

function isHandled(occ: Occurrence, next: Occurrence | null, mine: CompletionLike[]): boolean {
  return mine.some((c) => c.done_on >= occ.date && (next === null || c.done_on < next.date));
}

export function taskStatus(
  task: TaskLike,
  completions: CompletionLike[],
  today: IsoDate,
  ctx: ScheduleContext = {},
): TaskStatus {
  const s = effectiveSchedule(task, ctx);
  if (isFloating(s)) return floatingStatus(task, s, completions, today);

  const occurrence = occurrenceOnOrBefore(s, today, task.start_on);
  if (!occurrence) return { kind: 'idle', next: nextOccurrenceAfter(s, today, task.start_on) };
  const next = nextOccurrenceAfter(s, occurrence.date, task.start_on);
  const interval = next ? diffDays(next.date, occurrence.date) : 365;
  const mine = completionsFor(task.id, completions);

  if (isHandled(occurrence, next, mine)) return { kind: 'handled', occurrence, interval };
  if (today <= occurrence.dueBy) return { kind: 'due', occurrence, interval };
  if (task.if_missed === 'carry') {
    return { kind: 'waiting', occurrence, interval, daysLate: diffDays(today, occurrence.dueBy) };
  }
  return { kind: 'missed', occurrence, interval };
}

/** The next day this task will want attention, for labels like "Next: Sat". */
export function nextDue(
  task: TaskLike,
  completions: CompletionLike[],
  today: IsoDate,
  ctx: ScheduleContext = {},
): IsoDate | null {
  const status = taskStatus(task, completions, today, ctx);
  if (status.kind === 'due' || status.kind === 'waiting') return status.occurrence.date;
  if (status.kind === 'idle') return status.next?.date ?? null;
  const s = effectiveSchedule(task, ctx);
  if (isFloating(s)) {
    if (status.kind === 'missed') return addDays(status.occurrence.date, s.n);
    return floatingAnchor(task, s, completions);
  }
  return nextOccurrenceAfter(s, today, task.start_on)?.date ?? null;
}

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

export interface TodayItem<T extends TaskLike = TaskLike> {
  task: T;
  status: Extract<TaskStatus, { kind: 'due' | 'waiting' }>;
  score: number;
}

export interface TodayView<T extends TaskLike = TaskLike> {
  due: TodayItem<T>[];
  /** Up to CARRY_LIMIT carry-overs, most pressing first. */
  waiting: TodayItem<T>[];
  /** The rest, behind "Show more". */
  waitingMore: TodayItem<T>[];
  /** "As needed" checks for today: do them if they need doing, or leave them. */
  ifNeeded: TodayItem<T>[];
  /** Tasks with a completion dated today (shown as done). */
  doneToday: T[];
}

/** Carry-over rank: lateness ratio (days late ÷ interval) × priority weight. */
export function latenessScore(daysLate: number, interval: number, priority: Priority): number {
  return (daysLate / Math.max(1, interval)) * PRIORITY_WEIGHT[priority];
}

function byTitle(a: TaskLike, b: TaskLike) {
  return a.title.localeCompare(b.title);
}

export function buildToday<T extends TaskLike>(
  tasks: T[],
  completions: CompletionLike[],
  today: IsoDate,
  ctx: ScheduleContext = {},
  carryLimit = CARRY_LIMIT,
): TodayView<T> {
  const due: TodayItem<T>[] = [];
  const waiting: TodayItem<T>[] = [];
  const ifNeeded: TodayItem<T>[] = [];
  const doneIds = new Set(completions.filter((c) => c.done_on === today).map((c) => c.task_id));
  const doneToday: T[] = [];

  for (const task of tasks) {
    if (task.archived_at) continue;
    if (doneIds.has(task.id)) doneToday.push(task);
    const status = taskStatus(task, completions, today, ctx);
    if (status.kind === 'due' && task.if_missed === 'if_needed') {
      ifNeeded.push({ task, status, score: PRIORITY_WEIGHT[task.priority] });
    } else if (status.kind === 'due') {
      due.push({ task, status, score: PRIORITY_WEIGHT[task.priority] });
    } else if (status.kind === 'waiting') {
      waiting.push({
        task,
        status,
        score: latenessScore(status.daysLate, status.interval, task.priority),
      });
    }
  }

  due.sort(
    (a, b) =>
      PRIORITY_WEIGHT[b.task.priority] - PRIORITY_WEIGHT[a.task.priority] ||
      b.task.effort - a.task.effort ||
      byTitle(a.task, b.task),
  );
  waiting.sort(
    (a, b) =>
      b.score - a.score ||
      (b.status as { daysLate: number }).daysLate - (a.status as { daysLate: number }).daysLate ||
      byTitle(a.task, b.task),
  );
  doneToday.sort(byTitle);
  ifNeeded.sort((a, b) => byTitle(a.task, b.task));

  return {
    ifNeeded,
    due,
    waiting: waiting.slice(0, carryLimit),
    waitingMore: waiting.slice(carryLimit),
    doneToday,
  };
}

// ---------------------------------------------------------------------------
// Logging: backdating limits
// ---------------------------------------------------------------------------

export function backdateBounds(
  task: Pick<TaskLike, 'created_on'>,
  today: IsoDate,
): { min: IsoDate; max: IsoDate } {
  return { min: task.created_on <= today ? task.created_on : today, max: today };
}

export type DoneOnCheck = 'ok' | 'future' | 'before_created';

export function validateDoneOn(
  task: Pick<TaskLike, 'created_on'>,
  doneOn: IsoDate,
  today: IsoDate,
): DoneOnCheck {
  if (doneOn > today) return 'future';
  if (doneOn < backdateBounds(task, today).min) return 'before_created';
  return 'ok';
}

/** Quick picks for the long-press menu: today, yesterday, 2 days ago (within bounds). */
export function backdateChoices(
  task: Pick<TaskLike, 'created_on'>,
  today: IsoDate,
): { date: IsoDate; daysAgo: number }[] {
  return [0, 1, 2]
    .map((daysAgo) => ({ date: addDays(today, -daysAgo), daysAgo }))
    .filter((c) => validateDoneOn(task, c.date, today) === 'ok');
}

// ---------------------------------------------------------------------------
// Catch-up ("What got done?")
// ---------------------------------------------------------------------------

export interface CatchUpRow<T extends TaskLike = TaskLike> {
  task: T;
  /** Unfinished occurrence days in the window, newest first. */
  missed: IsoDate[];
  /** The chip selected by default. */
  defaultDay: IsoDate;
  /** Chips to offer, newest first (today back to the earliest allowed day). */
  days: IsoDate[];
}

export function catchUp<T extends TaskLike>(
  tasks: T[],
  completions: CompletionLike[],
  today: IsoDate,
  ctx: ScheduleContext = {},
  windowDays = CATCH_UP_DAYS,
): CatchUpRow<T>[] {
  const from = addDays(today, -windowDays);
  const yesterday = addDays(today, -1);
  const rows: CatchUpRow<T>[] = [];

  for (const task of tasks) {
    if (task.archived_at) continue;
    const s = effectiveSchedule(task, ctx);
    const mine = completionsFor(task.id, completions);
    let missed: IsoDate[] = [];

    if (isFloating(s)) {
      const status = floatingStatus(task, s, completions, today);
      if (status.kind === 'waiting' && status.occurrence.date >= from)
        missed = [status.occurrence.date];
      else if (status.kind === 'waiting') missed = [from];
      else if (status.kind === 'missed' || status.kind === 'due') {
        const anchor = floatingAnchor(task, s, completions);
        for (let d = anchor; d <= yesterday; d = addDays(d, s.n)) if (d >= from) missed.push(d);
      }
    } else {
      for (const occ of occurrencesBetween(s, from, yesterday, task.start_on)) {
        const next = nextOccurrenceAfter(s, occ.date, task.start_on);
        if (!isHandled(occ, next, mine)) missed.push(occ.date);
      }
      // A carry-over older than the window still counts: it's waiting on Today.
      const status = taskStatus(task, completions, today, ctx);
      if (status.kind === 'waiting' && status.occurrence.date < from) missed.push(from);
    }

    if (missed.length === 0) continue;
    missed = [...new Set(missed)].sort().reverse();
    const earliest = maxDate(from, task.created_on);
    const days = dateRange(earliest, today).reverse();
    const defaultDay = missed[0] as IsoDate;
    rows.push({ task, missed, defaultDay: days.includes(defaultDay) ? defaultDay : today, days });
  }

  return rows.sort(
    (a, b) =>
      (b.missed[0] as IsoDate).localeCompare(a.missed[0] as IsoDate) || byTitle(a.task, b.task),
  );
}

// ---------------------------------------------------------------------------
// Upcoming
// ---------------------------------------------------------------------------

export interface UpcomingDay<T extends TaskLike = TaskLike> {
  date: IsoDate;
  tasks: T[];
}

/** The next `days` days after today, each with the tasks that come due. */
export function upcoming<T extends TaskLike>(
  tasks: T[],
  completions: CompletionLike[],
  today: IsoDate,
  ctx: ScheduleContext = {},
  days = 7,
): UpcomingDay<T>[] {
  const range = dateRange(addDays(today, 1), addDays(today, days));
  const out = range.map((date) => ({ date, tasks: [] as T[] }));
  const byDate = new Map(out.map((d) => [d.date, d]));

  for (const task of tasks) {
    if (task.archived_at || task.if_missed === 'if_needed') continue;
    const s = effectiveSchedule(task, ctx);
    if (isFloating(s)) {
      const status = floatingStatus(task, s, completions, today);
      let next: IsoDate | null = null;
      if (status.kind === 'idle') next = status.next?.date ?? null;
      else if (status.kind === 'missed' || status.kind === 'due')
        next = addDays(status.occurrence.date, s.n);
      if (next) byDate.get(next)?.tasks.push(task);
      continue;
    }
    for (const occ of occurrencesBetween(
      s,
      range[0] as IsoDate,
      range[range.length - 1] as IsoDate,
      task.start_on,
    )) {
      byDate.get(occ.date)?.tasks.push(task);
    }
  }
  for (const d of out) d.tasks.sort(byTitle);
  return out;
}

// ---------------------------------------------------------------------------
// Areas and freshness
// ---------------------------------------------------------------------------

/**
 * Stale = the most recent occurrence whose window has ended wasn't handled, and
 * nothing has handled the current one either.
 */
export function isStale(
  task: TaskLike,
  completions: CompletionLike[],
  today: IsoDate,
  ctx: ScheduleContext = {},
): boolean {
  const s = effectiveSchedule(task, ctx);
  if (isFloating(s)) return floatingAnchor(task, s, completions) < today;

  const status = taskStatus(task, completions, today, ctx);
  if (status.kind === 'handled' || status.kind === 'idle') return false;
  if (status.kind === 'waiting' || status.kind === 'missed') return true;
  // Due now: look at the occurrence before it.
  const prev = occurrenceOnOrBefore(s, addDays(status.occurrence.date, -1), task.start_on);
  if (!prev) return false;
  const mine = completionsFor(task.id, completions);
  return !isHandled(prev, status.occurrence, mine);
}

export interface Freshness {
  fresh: number;
  total: number;
  /** 0–1; 1 when there are no tasks. */
  ratio: number;
}

export function freshness(
  tasks: TaskLike[],
  completions: CompletionLike[],
  today: IsoDate,
  ctx: ScheduleContext = {},
): Freshness {
  // "As needed" checks aren't required, so they never make an area look stale.
  const live = tasks.filter((t) => !t.archived_at && t.if_missed !== 'if_needed');
  const fresh = live.filter((t) => !isStale(t, completions, today, ctx)).length;
  return { fresh, total: live.length, ratio: live.length === 0 ? 1 : fresh / live.length };
}

/** Tasks located in `locationId` or anywhere beneath it. */
export function tasksUnder<T extends TaskLike>(
  tasks: T[],
  locationId: string,
  ancestry: (id: string) => string[],
): T[] {
  return tasks.filter(
    (t) => t.location_id !== null && ancestry(t.location_id).includes(locationId),
  );
}

// ---------------------------------------------------------------------------
// Weekly meter (interim until Phase 2 credits XP; see docs/DECISIONS.md #8)
// ---------------------------------------------------------------------------

export function weeklyPoints(
  completions: Array<CompletionLike & { task_id: string }>,
  effortOf: (taskId: string) => number | undefined,
  today: IsoDate,
): number {
  const { start, end } = weekBounds(today);
  let total = 0;
  for (const c of completions) {
    if (c.kind !== 'done' || c.done_on < start || c.done_on > end) continue;
    total += (effortOf(c.task_id) ?? 0) * 10;
  }
  return total;
}
