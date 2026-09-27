import { describe, expect, it } from 'vitest';
import { todayIn, type IsoDate } from '@/lib/dates';
import {
  backdateBounds,
  backdateChoices,
  buildToday,
  catchUp,
  effectiveSchedule,
  freshness,
  isStale,
  latenessScore,
  nextDue,
  nextOccurrenceAfter,
  occurrenceOnOrBefore,
  occurrencesBetween,
  rotationFor,
  taskStatus,
  tasksUnder,
  upcoming,
  validateDoneOn,
  weeklyPoints,
  type CompletionLike,
  type Schedule,
  type TaskLike,
} from './logic';

// Calendar anchors used below (2026):
//   Mon 09-21 · Sun 09-27 · Mon 09-28 · Thu 10-01 · Sat 10-03
let seq = 0;
function task(overrides: Partial<TaskLike> = {}): TaskLike {
  seq += 1;
  return {
    id: overrides.id ?? `t${seq}`,
    title: overrides.title ?? `Task ${seq}`,
    schedule: { type: 'daily' },
    if_missed: 'let_go',
    priority: 'normal',
    effort: 1,
    start_on: '2026-08-01',
    created_on: '2026-08-01',
    location_id: null,
    assignee_id: null,
    archived_at: null,
    ...overrides,
  };
}

function done(t: TaskLike, date: IsoDate, kind: 'done' | 'skipped' = 'done'): CompletionLike {
  return { task_id: t.id, done_on: date, kind };
}

const weekly = (...days: number[]): Schedule => ({ type: 'weekly_on', days: days as never });

describe('fixed schedule occurrences', () => {
  it('daily: every day, from start_on', () => {
    expect(occurrenceOnOrBefore({ type: 'daily' }, '2026-09-27', '2026-09-01')).toEqual({
      date: '2026-09-27',
      dueBy: '2026-09-27',
    });
    expect(occurrenceOnOrBefore({ type: 'daily' }, '2026-08-31', '2026-09-01')).toBeNull();
    expect(nextOccurrenceAfter({ type: 'daily' }, '2026-09-27', '2026-09-01')?.date).toBe(
      '2026-09-28',
    );
  });

  it('weekly_on: the latest listed weekday on or before the date', () => {
    const s = weekly(1, 4); // Mon, Thu
    expect(occurrenceOnOrBefore(s, '2026-09-27', '2026-08-01')?.date).toBe('2026-09-24'); // Thu
    expect(occurrenceOnOrBefore(s, '2026-09-28', '2026-08-01')?.date).toBe('2026-09-28'); // Mon itself
    expect(nextOccurrenceAfter(s, '2026-09-28', '2026-08-01')?.date).toBe('2026-10-01'); // Thu
  });

  it('weekly_on: nothing before start_on', () => {
    expect(occurrenceOnOrBefore(weekly(6), '2026-09-30', '2026-09-28')).toBeNull();
    expect(nextOccurrenceAfter(weekly(6), '2026-09-28', '2026-09-28')?.date).toBe('2026-10-03');
  });

  it('monthly_on day: clamps the 31st to the end of short months', () => {
    const s: Schedule = { type: 'monthly_on', day: 31 };
    expect(occurrenceOnOrBefore(s, '2026-03-10', '2026-01-01')?.date).toBe('2026-02-28');
    expect(occurrenceOnOrBefore(s, '2028-03-10', '2028-01-01')?.date).toBe('2028-02-29'); // leap year
    expect(occurrenceOnOrBefore(s, '2026-10-30', '2026-01-01')?.date).toBe('2026-09-30');
    expect(nextOccurrenceAfter(s, '2026-09-30', '2026-01-01')?.date).toBe('2026-10-31');
  });

  it('monthly_on nth weekday: first Saturday and last Sunday', () => {
    const firstSat: Schedule = { type: 'monthly_on', nth: 1, weekday: 6 };
    expect(occurrenceOnOrBefore(firstSat, '2026-10-10', '2026-01-01')?.date).toBe('2026-10-03');
    expect(occurrenceOnOrBefore(firstSat, '2026-10-02', '2026-01-01')?.date).toBe('2026-09-05');
    const lastSun: Schedule = { type: 'monthly_on', nth: -1, weekday: 0 };
    expect(occurrenceOnOrBefore(lastSun, '2026-09-30', '2026-01-01')?.date).toBe('2026-09-27');
    expect(nextOccurrenceAfter(lastSun, '2026-09-27', '2026-01-01')?.date).toBe('2026-10-25');
  });

  it('yearly_in: month-long windows, across the year boundary', () => {
    const s: Schedule = { type: 'yearly_in', months: [4, 10] };
    expect(occurrenceOnOrBefore(s, '2026-10-17', '2026-01-01')).toEqual({
      date: '2026-10-01',
      dueBy: '2026-10-31',
    });
    expect(occurrenceOnOrBefore(s, '2026-12-31', '2026-01-01')?.date).toBe('2026-10-01');
    expect(nextOccurrenceAfter(s, '2026-10-01', '2026-01-01')?.date).toBe('2027-04-01');
    const dec: Schedule = { type: 'yearly_in', months: [12] };
    expect(occurrenceOnOrBefore(dec, '2027-01-15', '2026-01-01')).toEqual({
      date: '2026-12-01',
      dueBy: '2026-12-31',
    });
  });

  it('yearly_in: a task created mid-window is still due that month', () => {
    const s: Schedule = { type: 'yearly_in', months: [10] };
    expect(occurrenceOnOrBefore(s, '2026-10-20', '2026-10-15')?.date).toBe('2026-10-01');
  });

  it('occurrencesBetween lists fixed occurrences in a range', () => {
    expect(
      occurrencesBetween(weekly(1), '2026-09-01', '2026-09-30', '2026-01-01').map((o) => o.date),
    ).toEqual(['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);
    expect(
      occurrencesBetween({ type: 'every_n_days', n: 3 }, '2026-09-01', '2026-09-30', '2026-01-01'),
    ).toEqual([]);
  });
});

describe('floating schedules (every_n_days)', () => {
  const s: Schedule = { type: 'every_n_days', n: 7 };

  it('is due on start_on when never done', () => {
    const t = task({ schedule: s, start_on: '2026-09-27', if_missed: 'carry' });
    expect(taskStatus(t, [], '2026-09-27').kind).toBe('due');
    expect(taskStatus(t, [], '2026-09-26').kind).toBe('idle');
  });

  it('acceptance: backdating to Monday on a 7-day task makes it due the following Monday', () => {
    const t = task({ schedule: s, if_missed: 'carry' });
    const c = [done(t, '2026-09-21')]; // logged on Sunday, done Monday
    expect(nextDue(t, c, '2026-09-27')).toBe('2026-09-28');
    expect(taskStatus(t, c, '2026-09-27')).toEqual({
      kind: 'idle',
      next: { date: '2026-09-28', dueBy: '2026-09-28' },
    });
    expect(taskStatus(t, c, '2026-09-28').kind).toBe('due');
  });

  it('skip restarts the clock too', () => {
    const t = task({ schedule: s, if_missed: 'carry' });
    expect(nextDue(t, [done(t, '2026-09-25', 'skipped')], '2026-09-27')).toBe('2026-10-02');
  });

  it('the latest completion wins, whatever order they arrive in', () => {
    const t = task({ schedule: s, if_missed: 'carry' });
    const c = [done(t, '2026-09-24'), done(t, '2026-09-10'), done(t, '2026-09-17')];
    expect(nextDue(t, c, '2026-09-27')).toBe('2026-10-01');
  });

  it('carry: stays as waiting after its due day', () => {
    const t = task({ schedule: s, if_missed: 'carry' });
    const status = taskStatus(t, [done(t, '2026-09-10')], '2026-09-27');
    expect(status).toMatchObject({
      kind: 'waiting',
      occurrence: { date: '2026-09-17' },
      daysLate: 10,
      interval: 7,
    });
  });

  it('let go: a missed due day rolls forward by N', () => {
    const t = task({ schedule: { type: 'every_n_days', n: 3 }, if_missed: 'let_go' });
    const c = [done(t, '2026-09-20')]; // due 09-23, 09-26, 09-29…
    expect(taskStatus(t, c, '2026-09-23').kind).toBe('due');
    expect(taskStatus(t, c, '2026-09-24').kind).toBe('missed');
    expect(taskStatus(t, c, '2026-09-26').kind).toBe('due');
    expect(nextDue(t, c, '2026-09-27')).toBe('2026-09-29');
  });
});

describe('no stacking', () => {
  it('acceptance: a weekly fixed task missed twice shows once', () => {
    const t = task({ schedule: weekly(1), if_missed: 'carry' });
    // Mondays 09-14 and 09-21 both missed; today is Sunday 09-27.
    const view = buildToday([t], [], '2026-09-27');
    expect(view.due).toHaveLength(0);
    expect([...view.waiting, ...view.waitingMore]).toHaveLength(1);
    expect(view.waiting[0]?.status.occurrence.date).toBe('2026-09-21');
  });

  it('a new occurrence replaces the unfinished older one', () => {
    const t = task({ schedule: weekly(1), if_missed: 'carry' });
    const view = buildToday([t], [], '2026-09-28'); // Monday again
    expect(view.due.map((i) => i.task.id)).toEqual([t.id]);
    expect(view.waiting).toHaveLength(0);
  });

  it('a daily carry task missed yesterday shows once today', () => {
    const t = task({ schedule: { type: 'daily' }, if_missed: 'carry' });
    const view = buildToday([t], [], '2026-09-27');
    expect(view.due).toHaveLength(1);
    expect(view.waiting).toHaveLength(0);
  });
});

describe('carry vs let go', () => {
  it('acceptance: a missed let_go task leaves Today the next day; a carry task stays', () => {
    const letGo = task({ schedule: weekly(6), if_missed: 'let_go' }); // Saturdays
    const carry = task({ schedule: weekly(6), if_missed: 'carry' });
    const sat = buildToday([letGo, carry], [], '2026-09-26');
    expect(sat.due.map((i) => i.task.id).sort()).toEqual([letGo.id, carry.id].sort());
    const sun = buildToday([letGo, carry], [], '2026-09-27');
    expect(sun.due).toHaveLength(0);
    expect(sun.waiting.map((i) => i.task.id)).toEqual([carry.id]);
    expect(taskStatus(letGo, [], '2026-09-27').kind).toBe('missed');
  });

  it('waiting reports the day it has been waiting since and how late it is', () => {
    const t = task({ schedule: weekly(1), if_missed: 'carry' });
    expect(taskStatus(t, [], '2026-09-24')).toMatchObject({
      kind: 'waiting',
      occurrence: { date: '2026-09-21' },
      daysLate: 3,
      interval: 7,
    });
  });

  it('yearly windows: due all month, then carry or let go', () => {
    const carry = task({ schedule: { type: 'yearly_in', months: [9] }, if_missed: 'carry' });
    const letGo = task({ schedule: { type: 'yearly_in', months: [9] }, if_missed: 'let_go' });
    expect(taskStatus(carry, [], '2026-09-27').kind).toBe('due');
    expect(taskStatus(carry, [], '2026-10-02')).toMatchObject({ kind: 'waiting', daysLate: 2 });
    expect(taskStatus(letGo, [], '2026-10-02').kind).toBe('missed');
  });
});

describe('handling occurrences', () => {
  it('done today handles today', () => {
    const t = task();
    expect(taskStatus(t, [done(t, '2026-09-27')], '2026-09-27').kind).toBe('handled');
  });

  it('skipped counts as handled for fixed schedules', () => {
    const t = task({ schedule: weekly(1), if_missed: 'carry' });
    expect(taskStatus(t, [done(t, '2026-09-22', 'skipped')], '2026-09-27').kind).toBe('handled');
  });

  it('a backdated completion handles the occurrence on or before its date', () => {
    const t = task({ schedule: weekly(1), if_missed: 'carry' });
    // Done Wednesday for Monday's occurrence.
    expect(taskStatus(t, [done(t, '2026-09-23')], '2026-09-27').kind).toBe('handled');
    // Done before Monday: that handled the previous week, so Monday still waits.
    expect(taskStatus(t, [done(t, '2026-09-20')], '2026-09-27').kind).toBe('waiting');
  });

  it('"done 2 days ago" on a daily task handles that day, not today', () => {
    const t = task();
    expect(taskStatus(t, [done(t, '2026-09-25')], '2026-09-27').kind).toBe('due');
  });
});

describe('Today sort order', () => {
  it('puts today’s items first, sorted by priority, effort, then title', () => {
    const a = task({ title: 'B low', priority: 'low' });
    const b = task({ title: 'A normal', priority: 'normal', effort: 1 });
    const c = task({ title: 'C normal heavy', priority: 'normal', effort: 3 });
    const d = task({ title: 'D high', priority: 'high' });
    const view = buildToday([a, b, c, d], [], '2026-09-27');
    expect(view.due.map((i) => i.task.title)).toEqual([
      'D high',
      'C normal heavy',
      'A normal',
      'B low',
    ]);
  });

  it('ranks carry-overs by lateness ratio times priority weight', () => {
    expect(latenessScore(3, 7, 'normal')).toBeCloseTo(3 / 7);
    expect(latenessScore(3, 7, 'high')).toBeCloseTo(6 / 7);
    expect(latenessScore(3, 7, 'low')).toBeCloseTo(1.5 / 7);
    // Floating tasks: days late ÷ N.
    const monthlyish = task({
      title: 'Filter',
      schedule: { type: 'every_n_days', n: 30 },
      if_missed: 'carry',
    });
    const weeklyLate = task({ title: 'Bathroom', schedule: weekly(1), if_missed: 'carry' });
    const highLate = task({
      title: 'Trash',
      schedule: weekly(3),
      if_missed: 'carry',
      priority: 'high',
    });
    const c = [done(monthlyish, '2026-08-18')]; // due 09-17, 10 days late → 10/30
    // today Sun 09-27: Trash since Wed (4 days, 4/7 × 2); Bathroom since Mon (6 days, 6/7)
    const view = buildToday([monthlyish, weeklyLate, highLate], c, '2026-09-27');
    expect(view.waiting.map((i) => i.task.title)).toEqual(['Trash', 'Bathroom', 'Filter']);
  });

  it('acceptance: shows at most 3 carry-overs and keeps the rest behind "Show more"', () => {
    const tasks = [1, 2, 3, 4, 5].map((n) =>
      task({
        title: `Carry ${n}`,
        schedule: { type: 'every_n_days', n: 10 },
        if_missed: 'carry',
        start_on: `2026-09-0${n}`,
      }),
    );
    const view = buildToday(tasks, [], '2026-09-27');
    expect(view.waiting).toHaveLength(3);
    expect(view.waitingMore).toHaveLength(2);
    // The oldest are most pressing.
    expect(view.waiting.map((i) => i.task.title)).toEqual(['Carry 1', 'Carry 2', 'Carry 3']);
  });

  it('lists tasks completed today and leaves out archived ones', () => {
    const t = task({ title: 'Wipe' });
    const archived = task({ title: 'Old', archived_at: '2026-09-01T00:00:00Z' });
    const view = buildToday([t, archived], [done(t, '2026-09-27')], '2026-09-27');
    expect(view.doneToday.map((x) => x.title)).toEqual(['Wipe']);
    expect(view.due).toHaveLength(0);
  });
});

describe('backdating', () => {
  const t = task({ created_on: '2026-09-25' });

  it('never allows a future date', () => {
    expect(validateDoneOn(t, '2026-09-28', '2026-09-27')).toBe('future');
  });

  it('never allows a date before the task existed', () => {
    expect(validateDoneOn(t, '2026-09-24', '2026-09-27')).toBe('before_created');
    expect(validateDoneOn(t, '2026-09-25', '2026-09-27')).toBe('ok');
    expect(backdateBounds(t, '2026-09-27')).toEqual({ min: '2026-09-25', max: '2026-09-27' });
  });

  it('offers today, yesterday, and 2 days ago, trimmed to the task’s age', () => {
    expect(backdateChoices(t, '2026-09-27').map((c) => c.daysAgo)).toEqual([0, 1, 2]);
    expect(backdateChoices(t, '2026-09-26').map((c) => c.daysAgo)).toEqual([0, 1]);
    expect(
      backdateChoices(task({ created_on: '2026-09-27' }), '2026-09-27').map((c) => c.daysAgo),
    ).toEqual([0]);
  });
});

describe('catch-up', () => {
  it('lists unfinished occurrences from the last 7 days, one row per task', () => {
    const daily = task({ title: 'Daily' });
    const c = [done(daily, '2026-09-22'), done(daily, '2026-09-24')];
    const rows = catchUp([daily], c, '2026-09-27');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.missed).toEqual([
      '2026-09-26',
      '2026-09-25',
      '2026-09-23',
      '2026-09-21',
      '2026-09-20',
    ]);
    expect(rows[0]?.defaultDay).toBe('2026-09-26');
    expect(rows[0]?.days[0]).toBe('2026-09-27');
    expect(rows[0]?.days.at(-1)).toBe('2026-09-20');
  });

  it('skips handled occurrences and tasks with nothing missed', () => {
    const weeklyDone = task({ schedule: weekly(1) });
    const idle = task({
      schedule: { type: 'every_n_days', n: 30 },
      if_missed: 'carry',
      start_on: '2026-10-10',
    });
    expect(catchUp([weeklyDone, idle], [done(weeklyDone, '2026-09-21')], '2026-09-27')).toEqual([]);
  });

  it('includes an old carry-over still waiting on Today', () => {
    const t = task({ schedule: { type: 'every_n_days', n: 7 }, if_missed: 'carry' });
    const rows = catchUp([t], [done(t, '2026-09-01')], '2026-09-27'); // due 09-08
    expect(rows).toHaveLength(1);
    expect(rows[0]?.defaultDay).toBe('2026-09-20');
  });

  it('never offers days before the task existed', () => {
    const t = task({ created_on: '2026-09-25', start_on: '2026-09-25' });
    const rows = catchUp([t], [], '2026-09-27');
    expect(rows[0]?.days).toEqual(['2026-09-27', '2026-09-26', '2026-09-25']);
  });
});

describe('upcoming', () => {
  it('lists the next 7 days with fixed and floating tasks', () => {
    const mon = task({ title: 'Monday', schedule: weekly(1) });
    const float = task({
      title: 'Float',
      schedule: { type: 'every_n_days', n: 5 },
      if_missed: 'carry',
    });
    const archived = task({
      title: 'Gone',
      schedule: weekly(2),
      archived_at: '2026-09-01T00:00:00Z',
    });
    const days = upcoming([mon, float, archived], [done(float, '2026-09-26')], '2026-09-27');
    expect(days).toHaveLength(7);
    expect(days[0]?.date).toBe('2026-09-28');
    expect(days[0]?.tasks.map((t) => t.title)).toEqual(['Monday']);
    expect(days.find((d) => d.date === '2026-10-01')?.tasks.map((t) => t.title)).toEqual(['Float']);
    expect(days.flatMap((d) => d.tasks).some((t) => t.title === 'Gone')).toBe(false);
  });
});

describe('zone rotation', () => {
  const kitchen = 'kitchen';
  const sinkSpot = 'sink';
  const ancestry = (id: string) => (id === sinkSpot ? [sinkSpot, kitchen, 'downstairs'] : [id]);

  it('weekly tasks in a mapped area inherit its weekday', () => {
    const t = task({ schedule: weekly(6), location_id: kitchen });
    expect(effectiveSchedule(t, { rotation: { '1': [kitchen] }, ancestry })).toEqual(weekly(1));
  });

  it('applies to spots beneath the area', () => {
    const t = task({ schedule: weekly(6), location_id: sinkSpot });
    expect(
      effectiveSchedule(t, { rotation: { '1': [kitchen], '4': [kitchen] }, ancestry }),
    ).toEqual(weekly(1, 4));
  });

  it('leaves daily, floating, and unmapped tasks alone', () => {
    const rotation = { '1': [kitchen] };
    expect(effectiveSchedule(task({ location_id: kitchen }), { rotation, ancestry })).toEqual({
      type: 'daily',
    });
    expect(
      effectiveSchedule(task({ schedule: weekly(6), location_id: 'garage' }), {
        rotation,
        ancestry,
      }),
    ).toEqual(weekly(6));
  });

  it('drives what shows on Today', () => {
    const t = task({ schedule: weekly(6), location_id: kitchen });
    const ctx = { rotation: { '1': [kitchen] }, ancestry };
    expect(buildToday([t], [], '2026-09-28', ctx).due).toHaveLength(1); // Monday
    expect(buildToday([t], [], '2026-10-03', ctx).due).toHaveLength(0); // Saturday
    expect(rotationFor(ctx.rotation, '2026-09-28')).toEqual([kitchen]);
    expect(rotationFor(ctx.rotation, '2026-09-27')).toEqual([]);
  });
});

describe('freshness', () => {
  it('counts tasks that are not overdue', () => {
    const fresh = task({ schedule: weekly(1) });
    const stale = task({ schedule: weekly(1), if_missed: 'carry' });
    const f = freshness([fresh, stale], [done(fresh, '2026-09-21')], '2026-09-27');
    expect(f).toEqual({ fresh: 1, total: 2, ratio: 0.5 });
  });

  it('a let-go task that was missed is stale until done again', () => {
    const t = task();
    expect(isStale(t, [done(t, '2026-09-25')], '2026-09-27')).toBe(true);
    expect(isStale(t, [done(t, '2026-09-26')], '2026-09-27')).toBe(false);
    expect(isStale(t, [done(t, '2026-09-27')], '2026-09-27')).toBe(false);
  });

  it('floating tasks are stale once past due', () => {
    const t = task({ schedule: { type: 'every_n_days', n: 7 } });
    expect(isStale(t, [done(t, '2026-09-21')], '2026-09-27')).toBe(false);
    expect(isStale(t, [done(t, '2026-09-19')], '2026-09-27')).toBe(true);
  });

  it('an empty area is fully fresh', () => {
    expect(freshness([], [], '2026-09-27')).toEqual({ fresh: 0, total: 0, ratio: 1 });
  });

  it('finds tasks in an area and its spots', () => {
    const ancestry = (id: string) => (id === 'sink' ? ['sink', 'kitchen'] : [id]);
    const inArea = task({ location_id: 'kitchen' });
    const inSpot = task({ location_id: 'sink' });
    const elsewhere = task({ location_id: 'yard' });
    expect(tasksUnder([inArea, inSpot, elsewhere], 'kitchen', ancestry).map((t) => t.id)).toEqual([
      inArea.id,
      inSpot.id,
    ]);
  });
});

describe('weekly meter (interim)', () => {
  it('sums effort × 10 for done completions this Monday–Sunday week', () => {
    const light = task({ effort: 1 });
    const heavy = task({ effort: 3 });
    const effort = (id: string) => [light, heavy].find((t) => t.id === id)?.effort;
    const c = [
      done(light, '2026-09-21'),
      done(heavy, '2026-09-27'),
      done(heavy, '2026-09-20'), // previous week
      done(light, '2026-09-22', 'skipped'), // skips earn nothing
    ];
    expect(weeklyPoints(c, effort, '2026-09-27')).toBe(40);
  });
});

describe('household timezone', () => {
  it('todayIn uses the household timezone, not the browser’s', () => {
    const instant = new Date('2026-09-28T02:30:00Z');
    expect(todayIn('America/Los_Angeles', instant)).toBe('2026-09-27');
    expect(todayIn('Asia/Tokyo', instant)).toBe('2026-09-28');
  });

  it('days never drift across a DST change', () => {
    // US DST ends 2026-11-01. A daily task stays daily through it.
    const t = task();
    expect(taskStatus(t, [done(t, '2026-10-31')], '2026-11-01').kind).toBe('due');
    expect(todayIn('America/New_York', new Date('2026-11-01T12:00:00Z'))).toBe('2026-11-01');
    const w = task({ schedule: weekly(0), if_missed: 'carry' });
    expect(nextOccurrenceAfter(w.schedule, '2026-11-01', w.start_on)?.date).toBe('2026-11-08');
  });
});
