import type { ThemePatterns } from '../../types';

// Faint diagonal stripes, drawn with the ink token so they work in both modes.
export const patterns: ThemePatterns = {
  background:
    'repeating-linear-gradient(135deg, color-mix(in srgb, var(--ink) 5%, transparent) 0 2px, transparent 2px 16px)',
  opacity: 0.05,
};
