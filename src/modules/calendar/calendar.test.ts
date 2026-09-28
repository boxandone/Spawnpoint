import { describe, expect, it } from 'vitest';
import { buildEvents, eventsOn, feedWindow, type CalendarSource } from './events';
import { escapeText, foldLine, toIcs } from './ics';

const src: CalendarSource = {
  plans: [
    {
      id: 'p1',
      title: 'Beach weekend',
      starts_on: '2026-10-09',
      ends_on: '2026-10-11',
      tentative: true,
    },
    { id: 'p2', title: 'No date', starts_on: null, ends_on: null, tentative: false },
    {
      id: 'p3',
      title: 'Archived',
      starts_on: '2026-10-01',
      ends_on: null,
      tentative: false,
      archived_at: 'x',
    },
  ],
  todos: [
    { id: 't1', title: 'Renew registration', due_on: '2026-10-02' },
    { id: 't2', title: 'Someday', due_on: null },
  ],
  tasks: [
    {
      id: 'k1',
      title: 'Trash night',
      schedule: { type: 'weekly_on', days: [2] },
      priority: 'high',
      start_on: '2026-01-01',
      location_id: null,
    },
    {
      id: 'k2',
      title: 'Water plants',
      schedule: { type: 'weekly_on', days: [6] },
      priority: 'normal',
      start_on: '2026-01-01',
      location_id: 'kitchen',
    },
    {
      id: 'k3',
      title: 'Floating',
      schedule: { type: 'every_n_days', n: 10 },
      priority: 'high',
      start_on: '2026-01-01',
      location_id: null,
    },
  ],
  rotation: { '4': ['downstairs'] },
  locations: [
    { id: 'downstairs', parent_id: null },
    { id: 'kitchen', parent_id: 'downstairs' },
  ],
};

describe('buildEvents', () => {
  const from = '2026-09-28';
  const to = '2026-10-11';

  it('includes dated plans and to-dos, skipping undated and archived ones', () => {
    const ev = buildEvents(src, from, to, 'none');
    expect(ev.map((e) => e.uid)).toEqual(['todo-t1', 'plan-p1']);
    expect(ev[1]).toMatchObject({
      start: '2026-10-09',
      end: '2026-10-11',
      tentative: true,
      path: '/plans/p1',
    });
  });

  it('adds only high-priority fixed chores in "high" mode', () => {
    const titles = buildEvents(src, from, to, 'high')
      .filter((e) => e.kind === 'chore')
      .map((e) => e.start);
    expect(titles).toEqual(['2026-09-29', '2026-10-06']);
  });

  it('adds every fixed chore in "fixed" mode, following zone rotation, never floating ones', () => {
    const chores = buildEvents(src, from, to, 'fixed').filter((e) => e.kind === 'chore');
    expect(chores.map((e) => `${e.title}@${e.start}`)).toEqual([
      'Trash night@2026-09-29',
      'Water plants@2026-10-01',
      'Trash night@2026-10-06',
      'Water plants@2026-10-08',
    ]);
    expect(new Set(chores.map((e) => e.uid)).size).toBe(chores.length);
  });

  it('keeps chores inside their own window', () => {
    const ev = buildEvents(src, from, to, 'high', { from: '2026-10-01', to: '2026-10-11' });
    expect(ev.filter((e) => e.kind === 'chore').map((e) => e.start)).toEqual(['2026-10-06']);
  });

  it('finds events on a day, including multi-day plans', () => {
    const ev = buildEvents(src, from, to, 'none');
    expect(eventsOn(ev, '2026-10-10').map((e) => e.uid)).toEqual(['plan-p1']);
  });

  it('the feed covers two months back and a year ahead', () => {
    expect(feedWindow('2026-09-28')).toEqual({
      from: '2026-07-30',
      to: '2027-09-28',
      chores: { from: '2026-09-21', to: '2026-11-27' },
    });
  });
});

describe('ics', () => {
  it('escapes text', () => {
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });

  it('folds long lines at 75 bytes, even with emoji', () => {
    const folded = foldLine(`SUMMARY:${'🏖'.repeat(40)}`);
    for (const line of folded.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(
      folded
        .split('\r\n')
        .slice(1)
        .every((l) => l.startsWith(' ')),
    ).toBe(true);
  });

  it('writes all-day events with an exclusive end date', () => {
    const ev = buildEvents(src, '2026-09-28', '2026-10-11', 'none');
    const text = toIcs(ev, {
      name: 'Spawnpoint',
      siteUrl: 'https://example.app/',
      now: new Date('2026-09-28T12:00:00Z'),
      host: 'example.app',
    });
    expect(text.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(text.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(text).toContain('UID:plan-p1@example.app');
    expect(text).toContain('DTSTART;VALUE=DATE:20261009');
    expect(text).toContain('DTEND;VALUE=DATE:20261012');
    expect(text).toContain('STATUS:TENTATIVE');
    expect(text).toContain('URL:https://example.app/plans/p1');
    expect(text).toContain('DTSTAMP:20260928T120000Z');
    expect(text.split('\r\n').filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(2);
  });
});
