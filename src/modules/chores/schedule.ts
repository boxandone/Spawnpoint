import { z } from 'zod';
import { monthName, ordinal, weekdayName } from '../../lib/dates';
import type { CopyKey, CopyVars } from '../../theme/copy';
import type { Schedule } from './logic';

/** Same shape as useCopy's translate; typed here so this file stays free of React. */
type Translate = (key: CopyKey, vars?: CopyVars) => string;

const weekday = z.number().int().min(0).max(6);

/** Mirrors private.valid_schedule() in the chores migration. */
export const schedule = z.union([
  z.object({ type: z.literal('daily') }).strict(),
  z.object({ type: z.literal('every_n_days'), n: z.number().int().min(1).max(365) }).strict(),
  z.object({ type: z.literal('weekly_on'), days: z.array(weekday).min(1).max(7) }).strict(),
  z.object({ type: z.literal('monthly_on'), day: z.number().int().min(1).max(31) }).strict(),
  z
    .object({
      type: z.literal('monthly_on'),
      nth: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(-1)]),
      weekday,
    })
    .strict(),
  z
    .object({
      type: z.literal('yearly_in'),
      months: z.array(z.number().int().min(1).max(12)).min(1).max(12),
    })
    .strict(),
]);

/** Parse a schedule from the database, falling back to daily if it's malformed. */
export function parseSchedule(value: unknown): Schedule {
  const parsed = schedule.safeParse(value);
  return parsed.success ? (parsed.data as Schedule) : { type: 'daily' };
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** "Every 10 days", "Weekly on Mon and Thu", "Monthly on the first Sat". */
export function describeSchedule(s: Schedule, t: Translate): string {
  switch (s.type) {
    case 'daily':
      return t('schedule.daily');
    case 'every_n_days':
      return s.n === 1 ? t('schedule.every_n_days.one') : t('schedule.every_n_days', { n: s.n });
    case 'weekly_on': {
      const days = [...s.days]
        .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
        .map((d) => weekdayName(d));
      return days.length === 7
        ? t('schedule.daily')
        : t('schedule.weekly_on', { days: list(days) });
    }
    case 'monthly_on':
      if ('day' in s) return t('schedule.monthly_day', { day: ordinal(s.day) });
      return t('schedule.monthly_nth', {
        nth: t(`schedule.nth.${s.nth}` as 'schedule.nth.1'),
        weekday: weekdayName(s.weekday),
      });
    case 'yearly_in':
      return t('schedule.yearly_in', {
        months: list([...s.months].sort((a, b) => a - b).map((m) => monthName(m))),
      });
  }
}
