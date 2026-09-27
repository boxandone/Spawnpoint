import { describe, expect, it } from 'vitest';
import { translate } from '@/theme/copy';
import { describeSchedule, parseSchedule, schedule } from './schedule';

const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
  translate({}, key, vars);

describe('schedule validation', () => {
  it('accepts every schedule type', () => {
    for (const s of [
      { type: 'daily' },
      { type: 'every_n_days', n: 10 },
      { type: 'weekly_on', days: [1, 4] },
      { type: 'monthly_on', day: 31 },
      { type: 'monthly_on', nth: -1, weekday: 0 },
      { type: 'yearly_in', months: [4, 10] },
    ]) {
      expect(schedule.safeParse(s).success, JSON.stringify(s)).toBe(true);
    }
  });

  it('rejects malformed schedules like the database does', () => {
    for (const s of [
      { type: 'weekly_on', days: [] },
      { type: 'every_n_days', n: 0 },
      { type: 'monthly_on', day: 32 },
      { type: 'monthly_on', nth: 5, weekday: 1 },
      { type: 'yearly_in', months: [13] },
      { type: 'hourly' },
    ]) {
      expect(schedule.safeParse(s).success, JSON.stringify(s)).toBe(false);
    }
    expect(parseSchedule({ type: 'nope' })).toEqual({ type: 'daily' });
  });
});

describe('describeSchedule', () => {
  it('reads naturally', () => {
    expect(describeSchedule({ type: 'daily' }, t)).toBe('Every day');
    expect(describeSchedule({ type: 'every_n_days', n: 10 }, t)).toBe('Every 10 days');
    expect(describeSchedule({ type: 'weekly_on', days: [4, 1] }, t)).toBe('Weekly on Mon and Thu');
    expect(describeSchedule({ type: 'weekly_on', days: [0] }, t)).toBe('Weekly on Sun');
    expect(describeSchedule({ type: 'monthly_on', day: 1 }, t)).toBe('Monthly on the 1st');
    expect(describeSchedule({ type: 'monthly_on', nth: 1, weekday: 6 }, t)).toBe(
      'Monthly on the first Sat',
    );
    expect(describeSchedule({ type: 'yearly_in', months: [10, 4] }, t)).toBe(
      'Any time in Apr and Oct',
    );
  });
});
