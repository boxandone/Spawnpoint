import type { ComponentType, ReactNode } from 'react';
import type { CopyDict } from './copy';

export type ThemeMode = 'light' | 'dark';
export type ModePreference = ThemeMode | 'system';

export type EffortLevel = 1 | 2 | 3;
export type BadgeTier = 'locked' | 'bronze' | 'silver' | 'gold';

export type CelebrationEvent = 'taskComplete' | 'badgeEarned' | 'levelUp' | 'meterFull';

export interface CelebrationContext {
  /** Full-screen, pointer-transparent layer to draw effects into. */
  layer: HTMLElement;
  /** Where the effect should start (center of the tapped element), in viewport px. */
  origin: { x: number; y: number };
  /** Element the effect relates to (a task row, a meter). Optional. */
  target?: HTMLElement | null;
  /** Element whose computed CSS variables give the effect its colors. */
  scope: HTMLElement;
  /** Short text some effects show ("Charged!"). Already run through useCopy. */
  text?: string;
}

export interface Celebration {
  full: (ctx: CelebrationContext) => void;
  /** Used under prefers-reduced-motion: no movement, no shaking, no confetti. */
  reduced: (ctx: CelebrationContext) => void;
}

export type CelebrationSet = Record<CelebrationEvent, Celebration>;

export interface EffortIconProps {
  level: EffortLevel;
  className?: string;
  title?: string;
}

export interface BadgeFrameProps {
  tier: BadgeTier;
  /** The universal badge glyph drawn inside the frame. */
  children?: ReactNode;
  size?: number;
  label?: string;
}

export interface AvatarDef {
  /** Stable id stored on the member row, e.g. "classic/sprout". Never rename. */
  id: string;
  name: string;
  src: string;
}

export interface ThemePatterns {
  /** CSS background-image value for the page texture, or 'none'. */
  background: string;
  /** Opacity of the texture ink. Must stay at 0.06 or less (tested). */
  opacity: number;
}

export type LevelTitles = readonly [string, string, string, string, string, string];

export interface ThemeMeta {
  id: string;
  name: string;
  description: string;
  fonts: { display: string; body: string; num: string };
  /** Signature views and other optional behavior. */
  features: Record<string, boolean>;
  /** One title per level band: 1, 5, 10, 20, 35, 50+. */
  levelTitles: LevelTitles;
}

export interface ThemePack extends ThemeMeta {
  copy: Partial<CopyDict>;
  patterns: ThemePatterns;
  celebrate: CelebrationSet;
  Effort: ComponentType<EffortIconProps>;
  BadgeFrame: ComponentType<BadgeFrameProps>;
  avatars: AvatarDef[];
}
