/**
 * WCAG contrast helpers and a tiny parser for pack tokens.css files.
 * Used by the contrast test and the styleguide's live contrast readout.
 */

export const COLOR_TOKENS = [
  'bg',
  'surface',
  'surface-2',
  'ink',
  'ink-muted',
  'line',
  'primary',
  'primary-ink',
  'secondary',
  'on-secondary',
  'accent',
  'on-accent',
  'success',
  'on-success',
  'warning',
  'on-warning',
  'danger',
  'on-danger',
] as const;

export const SHAPE_TOKENS = [
  'radius',
  'panel-cut',
  'panel-border',
  'shadow-press',
  'font-display',
  'font-body',
  'font-num',
] as const;

/** Every [text, background] pair the UI draws. Each must reach 4.5:1. */
export const TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink', 'surface-2'],
  ['ink-muted', 'bg'],
  ['ink-muted', 'surface'],
  ['ink-muted', 'surface-2'],
  ['primary-ink', 'primary'],
  ['on-secondary', 'secondary'],
  ['on-accent', 'accent'],
  ['on-success', 'success'],
  ['on-warning', 'warning'],
  ['on-danger', 'danger'],
];

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Not a hex color: ${hex}`);
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export type TokenMap = Record<string, string>;

function parseBlock(css: string, selector: string): TokenMap | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  if (!match?.[1]) return null;
  const tokens: TokenMap = {};
  for (const m of match[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[m[1] as string] = (m[2] as string).trim();
  }
  return tokens;
}

/** Returns the light tokens and the dark tokens (dark inherits anything it doesn't redefine). */
export function parseThemeTokens(css: string, id: string): { light: TokenMap; dark: TokenMap } {
  const light = parseBlock(css, `[data-app-theme='${id}']`);
  const darkOnly = parseBlock(css, `[data-app-theme='${id}'][data-theme='dark']`);
  if (!light) throw new Error(`No light block for theme ${id}`);
  if (!darkOnly) throw new Error(`No dark block for theme ${id}`);
  return { light, dark: { ...light, ...darkOnly } };
}
