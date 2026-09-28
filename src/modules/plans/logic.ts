/** Pure plan rules: types, statuses, countdowns, the board, and the timeline. */
import { diffDays, type IsoDate } from '../../lib/dates';

export const PLAN_TYPES = ['trip', 'project', 'decision', 'event'] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const PLAN_STATUSES = ['someday', 'discussing', 'planning', 'booked', 'done'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLAN_COLORS = [
  'sky',
  'mint',
  'peach',
  'lilac',
  'lemon',
  'rose',
  'sage',
  'sand',
] as const;

export interface PlanLike {
  id: string;
  title: string;
  status: string;
  starts_on: string | null;
  ends_on: string | null;
  archived_at: string | null;
}

export type Countdown =
  | { kind: 'soon'; days: number }
  | { kind: 'today' }
  | { kind: 'now' }
  | { kind: 'past'; days: number };

/** "42 days", "Today", "Now" (during a date range), or how long ago it ended. */
export function countdown(
  plan: Pick<PlanLike, 'starts_on' | 'ends_on'>,
  today: IsoDate,
): Countdown | null {
  if (!plan.starts_on) return null;
  const end = plan.ends_on ?? plan.starts_on;
  if (plan.starts_on > today) return { kind: 'soon', days: diffDays(plan.starts_on, today) };
  if (plan.starts_on === today && end === today) return { kind: 'today' };
  if (end >= today) return { kind: 'now' };
  return { kind: 'past', days: diffDays(today, end) };
}

/** The board: live plans grouped by status, in status order, soonest first. */
export function board<T extends PlanLike>(
  plans: readonly T[],
): Array<{ status: PlanStatus; plans: T[] }> {
  const live = plans.filter((p) => !p.archived_at);
  return PLAN_STATUSES.map((status) => ({
    status,
    plans: live
      .filter((p) => p.status === status)
      .sort(
        (a, b) =>
          (a.starts_on ?? '9999').localeCompare(b.starts_on ?? '9999') ||
          a.title.localeCompare(b.title),
      ),
  }));
}

/**
 * The timeline: dated plans that haven't ended more than `keepDays` ago, by
 * start date, then plans with no date yet.
 */
export function timeline<T extends PlanLike>(
  plans: readonly T[],
  today: IsoDate,
  keepDays = 30,
): { dated: T[]; undated: T[] } {
  const live = plans.filter((p) => !p.archived_at);
  const dated = live
    .filter((p) => p.starts_on && diffDays(today, p.ends_on ?? (p.starts_on as string)) <= keepDays)
    .sort(
      (a, b) =>
        (a.starts_on as string).localeCompare(b.starts_on as string) ||
        a.title.localeCompare(b.title),
    );
  const undated = live
    .filter((p) => !p.starts_on && p.status !== 'done')
    .sort((a, b) => a.title.localeCompare(b.title));
  return { dated, undated };
}

export function checklistProgress(items: ReadonlyArray<{ done: boolean }>): {
  done: number;
  total: number;
} {
  return { done: items.filter((i) => i.done).length, total: items.length };
}
