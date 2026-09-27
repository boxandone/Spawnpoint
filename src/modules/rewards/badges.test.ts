// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_BADGES, DEED_BADGES, frameTier, MILESTONES, nextThreshold } from './badges';
import { DEEDS } from './deeds';

const migration = readFileSync(
  join(__dirname, '../../../supabase/migrations/20260927000900_rewards.sql'),
  'utf8',
);

function sqlRow(key: string) {
  const m = new RegExp(
    `\\('${key}', '(deed|milestone)', '\\{([^}]*)\\}'(?:, ([^,]+), (\\d+), (\\w+))?`,
  ).exec(migration);
  return m
    ? {
        family: m[1],
        thresholds: (m[2] as string).split(',').map(Number),
        unit: m[3],
        xp: m[4],
        cooldown: m[5],
      }
    : null;
}

describe('badge catalog', () => {
  it('has unique keys', () => {
    const keys = ALL_BADGES.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(DEEDS.map((d) => [d.key, d] as const))(
    'deed %s matches the database catalog',
    (key, d) => {
      const row = sqlRow(key);
      expect(row, key).not.toBeNull();
      expect(row!.family).toBe('deed');
      expect(row!.thresholds).toEqual([...d.tiers]);
      expect(Number(row!.xp)).toBe(d.xp);
      expect(row!.cooldown === 'null' ? null : Number(row!.cooldown)).toBe(d.cooldownDays);
    },
  );

  it.each(MILESTONES.map((m) => [m.key, m] as const))(
    'milestone %s matches the database catalog',
    (key, m) => {
      const row = sqlRow(key);
      expect(row, key).not.toBeNull();
      expect(row!.thresholds).toEqual([...m.thresholds]);
    },
  );

  it('maps tiers to frames and finds the next goal', () => {
    expect(frameTier(0, 3)).toBe('locked');
    expect(frameTier(1, 3)).toBe('bronze');
    expect(frameTier(2, 3)).toBe('silver');
    expect(frameTier(1, 1)).toBe('gold');
    expect(frameTier(4, 4)).toBe('gold');
    const valves = DEED_BADGES.find((b) => b.key === 'valve_exercise')!;
    expect(nextThreshold(valves, 12)).toBe(50);
    expect(nextThreshold(valves, 150)).toBeNull();
  });
});
