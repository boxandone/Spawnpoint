import { describe, expect, it } from 'vitest';
import { capCredit, levelForXp, levelProgress, xpForLevel } from './levels';

describe('levels (docs/SPEC.md 4.9 table)', () => {
  it.each([
    [5, 550],
    [10, 1800],
    [20, 6175],
    [35, 17425],
    [50, 34300],
  ])('level %i needs %i total XP', (level, xp) => {
    expect(xpForLevel(level)).toBe(xp);
    expect(levelForXp(xp)).toBe(level);
    expect(levelForXp(xp - 1)).toBe(level - 1);
  });

  it('reports progress inside a level', () => {
    expect(levelProgress(650)).toEqual({ level: 5, into: 100, span: 200, ratio: 0.5 });
  });
});

describe('daily soft cap', () => {
  it('acceptance: 200 raw XP in one day credits 40 + 20 + 12 = 72', () => {
    let before = 0;
    let credited = 0;
    for (const raw of [30, 30, 30, 30, 30, 30, 20]) {
      credited += capCredit(before, raw);
      before += raw;
    }
    expect(credited).toBeCloseTo(72);
  });

  it('splits an event that crosses a boundary', () => {
    expect(capCredit(30, 20)).toBe(15);
    expect(capCredit(70, 20)).toBe(6);
  });
});
