/**
 * Level math for display. The database is the source of truth (level_for_xp,
 * xp_for_level in the rewards migration); these mirror it so the UI can draw
 * progress bars and share cards. Constants are universal (docs/SPEC.md 4.9).
 */
export const TASK_XP = { 1: 10, 2: 20, 3: 30 } as const;
export const HELPER_XP = 2;
export const WELCOME_BACK_XP = 20;

/** XP to go from level L to L+1. */
export function xpToNext(level: number): number {
  return 100 + 25 * (level - 1);
}

/** Total XP needed to reach a level. */
export function xpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToNext(l);
  return total;
}

export function levelForXp(xp: number): number {
  let level = 1;
  let rest = Math.max(0, xp);
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return level;
}

/** The daily soft cap: 40 in full, the next 40 at 50%, the rest at 10%. */
export function capCredit(before: number, raw: number): number {
  const after = before + raw;
  const full = Math.max(0, Math.min(after, 40) - Math.min(before, 40));
  const half = Math.max(0, Math.min(after, 80) - Math.max(before, 40));
  const tenth = Math.max(0, after - Math.max(before, 80));
  return full + 0.5 * half + 0.1 * tenth;
}

export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - start, span: next - start, ratio: (xp - start) / (next - start) };
}
