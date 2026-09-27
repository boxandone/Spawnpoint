import type { IconName } from '@/components/ui';
import { DEEDS, type DeedCategory } from './deeds';

/**
 * Display info for every badge. Names and glyphs are universal; the theme
 * supplies the frame and the word for "badge". Thresholds mirror
 * public.badge_catalog (a test checks the deed rows against the migration).
 */
export interface BadgeInfo {
  key: string;
  name: string;
  family: 'deed' | 'milestone';
  thresholds: readonly number[];
  unit?: string;
  glyph: IconName;
  /** Earned in a later phase; shown locked until then. */
  later?: boolean;
}

const CATEGORY_GLYPH: Record<DeedCategory, IconName> = {
  plumbing: 'drop',
  water: 'drop',
  systems: 'bolt',
  safety: 'shield',
  appliances: 'bolt',
  repairs: 'wrench',
  outside: 'leaf',
  pool: 'drop',
  pets: 'paw',
  organizing: 'archive',
};

export const MILESTONES: BadgeInfo[] = [
  {
    key: 'active_weeks',
    name: 'Active weeks',
    family: 'milestone',
    thresholds: [4, 12, 26, 52],
    glyph: 'calendar',
  },
  { key: 'early_bird', name: 'Early bird', family: 'milestone', thresholds: [10], glyph: 'sun' },
  { key: 'night_owl', name: 'Night owl', family: 'milestone', thresholds: [10], glyph: 'moon' },
  {
    key: 'helping_hand',
    name: 'Helping hand',
    family: 'milestone',
    thresholds: [10],
    glyph: 'users',
  },
  { key: 'catch_up', name: 'Catch-up', family: 'milestone', thresholds: [5], glyph: 'history' },
  { key: 'comeback', name: 'Comeback', family: 'milestone', thresholds: [1], glyph: 'undo' },
  {
    key: 'clean_sweep',
    name: 'Clean sweep',
    family: 'milestone',
    thresholds: [1],
    glyph: 'sparkle',
  },
  {
    key: 'seasonal',
    name: 'Season track',
    family: 'milestone',
    thresholds: [1, 4, 8],
    glyph: 'star',
  },
  {
    key: 'paper_trail',
    name: 'Paper trail',
    family: 'milestone',
    thresholds: [10, 50, 100],
    glyph: 'copy',
    later: true,
  },
  {
    key: 'curator',
    name: 'Curator',
    family: 'milestone',
    thresholds: [25, 100, 250],
    glyph: 'stuff',
    later: true,
  },
  {
    key: 'labeler',
    name: 'Labeler',
    family: 'milestone',
    thresholds: [10],
    glyph: 'scan',
    later: true,
  },
  {
    key: 'declutter',
    name: 'Declutter',
    family: 'milestone',
    thresholds: [10],
    glyph: 'archive',
    later: true,
  },
  {
    key: 'trip_booked',
    name: 'Trip booked',
    family: 'milestone',
    thresholds: [1],
    glyph: 'map',
    later: true,
  },
  {
    key: 'plans_finished',
    name: 'Plans finished',
    family: 'milestone',
    thresholds: [1, 5, 20],
    glyph: 'plans',
    later: true,
  },
];

export const DEED_BADGES: BadgeInfo[] = DEEDS.map((d) => ({
  key: d.key,
  name: d.name,
  family: 'deed',
  thresholds: d.tiers,
  unit: 'unit' in d ? d.unit : undefined,
  glyph: CATEGORY_GLYPH[d.category],
}));

export const ALL_BADGES: BadgeInfo[] = [...MILESTONES, ...DEED_BADGES];
const byKey = new Map(ALL_BADGES.map((b) => [b.key, b]));

export function getBadge(key: string): BadgeInfo | undefined {
  return byKey.get(key);
}

/** Tier 1..n maps to a frame; badges with fewer tiers top out at gold. */
export function frameTier(tier: number, tiers: number): 'locked' | 'bronze' | 'silver' | 'gold' {
  if (tier <= 0) return 'locked';
  if (tier >= tiers) return 'gold';
  return tier === 1 ? 'bronze' : tier === 2 ? 'silver' : 'gold';
}

/** The next threshold to reach, or null when every tier is earned. */
export function nextThreshold(info: BadgeInfo, count: number): number | null {
  return info.thresholds.find((t) => count < t) ?? null;
}
