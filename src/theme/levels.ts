import type { LevelTitles } from './types';

/** Level bands shared by every theme (docs/SPEC.md 4.9): 1, 5, 10, 20, 35, 50+. */
export const LEVEL_BANDS = [1, 5, 10, 20, 35, 50] as const;

export function levelBand(level: number): number {
  let band = 0;
  LEVEL_BANDS.forEach((min, i) => {
    if (level >= min) band = i;
  });
  return band;
}

export function levelTitle(titles: LevelTitles, level: number): string {
  return titles[levelBand(level)] as string;
}
