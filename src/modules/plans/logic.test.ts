import { describe, expect, it } from 'vitest';
import { board, checklistProgress, countdown, timeline } from './logic';

const today = '2026-09-28';

describe('countdown', () => {
  it('counts days to the start', () => {
    expect(countdown({ starts_on: '2026-11-09', ends_on: null }, today)).toEqual({
      kind: 'soon',
      days: 42,
    });
  });
  it('says today for a one-day plan today', () => {
    expect(countdown({ starts_on: today, ends_on: null }, today)).toEqual({ kind: 'today' });
  });
  it('says now during a date range', () => {
    expect(countdown({ starts_on: '2026-09-27', ends_on: '2026-09-30' }, today)).toEqual({
      kind: 'now',
    });
    expect(countdown({ starts_on: today, ends_on: '2026-09-30' }, today)).toEqual({ kind: 'now' });
  });
  it('says how long ago it ended', () => {
    expect(countdown({ starts_on: '2026-09-20', ends_on: '2026-09-25' }, today)).toEqual({
      kind: 'past',
      days: 3,
    });
  });
  it('has nothing to say without a date', () => {
    expect(countdown({ starts_on: null, ends_on: null }, today)).toBeNull();
  });
});

const p = (id: string, status: string, starts_on: string | null, extra = {}) => ({
  id,
  title: id,
  status,
  starts_on,
  ends_on: null,
  archived_at: null,
  ...extra,
});

describe('board', () => {
  it('groups by status in order, soonest first, without archived plans', () => {
    const cols = board([
      p('b', 'planning', '2026-12-01'),
      p('a', 'planning', '2026-10-01'),
      p('c', 'planning', null),
      p('d', 'done', '2026-01-01'),
      p('e', 'someday', null, { archived_at: '2026-01-01T00:00:00Z' }),
    ]);
    expect(cols.map((c) => c.status)).toEqual([
      'someday',
      'discussing',
      'planning',
      'booked',
      'done',
    ]);
    expect(cols[2]?.plans.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(cols[0]?.plans).toEqual([]);
  });
});

describe('timeline', () => {
  it('shows dated plans by start, recent past included, then undated ones', () => {
    const { dated, undated } = timeline(
      [
        p('later', 'planning', '2027-01-01'),
        p('soon', 'booked', '2026-10-05'),
        p('recent', 'done', '2026-09-10'),
        p('old', 'done', '2026-06-01'),
        p('someday', 'someday', null),
        p('finished', 'done', null),
      ],
      today,
    );
    expect(dated.map((x) => x.id)).toEqual(['recent', 'soon', 'later']);
    expect(undated.map((x) => x.id)).toEqual(['someday']);
  });
});

describe('checklistProgress', () => {
  it('counts what is done', () => {
    expect(checklistProgress([{ done: true }, { done: false }, { done: true }])).toEqual({
      done: 2,
      total: 3,
    });
  });
});
