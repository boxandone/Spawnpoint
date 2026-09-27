import { classic } from './themes/classic';
import { squadHq } from './themes/squad-hq';
import type { AvatarDef, ThemePack } from './types';

/**
 * Packs that ship in this build, in gallery order. Phase 6 adds the rest of
 * docs/THEMES.md here, one per commit.
 */
export const THEME_PACKS: readonly ThemePack[] = [classic, squadHq];

export const THEME_IDS = THEME_PACKS.map((p) => p.id);
export const DEFAULT_THEME_ID = 'classic';

const byId = new Map(THEME_PACKS.map((p) => [p.id, p]));

export function isThemeId(id: string | null | undefined): id is string {
  return !!id && byId.has(id);
}

/** Unknown or not-yet-shipped ids fall back to Classic. */
export function getPack(id: string | null | undefined): ThemePack {
  return (id && byId.get(id)) || classic;
}

const avatarIndex = new Map<string, AvatarDef>(
  THEME_PACKS.flatMap((p) => p.avatars.map((a) => [a.id, a] as const)),
);

export function getAvatar(id: string | null | undefined): AvatarDef | undefined {
  return id ? avatarIndex.get(id) : undefined;
}
