// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COLOR_TOKENS,
  SHAPE_TOKENS,
  TEXT_PAIRS,
  contrastRatio,
  parseThemeTokens,
} from './contrast';
import { THEME_IDS } from './registry';

const themesDir = join(__dirname, 'themes');

describe('contrast helpers', () => {
  it('matches known WCAG ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });
});

describe.each(THEME_IDS)('theme "%s"', (id) => {
  const css = readFileSync(join(themesDir, id, 'tokens.css'), 'utf8');
  const { light, dark } = parseThemeTokens(css, id);

  it('defines every shared token in light mode', () => {
    for (const t of [...COLOR_TOKENS, ...SHAPE_TOKENS]) expect(light, t).toHaveProperty(t);
  });

  it('redefines every color token in dark mode', () => {
    const darkBlock = css.slice(css.indexOf(`[data-app-theme='${id}'][data-theme='dark']`));
    for (const t of COLOR_TOKENS) expect(darkBlock, t).toContain(`--${t}:`);
  });

  for (const [mode, tokens] of [
    ['light', light],
    ['dark', dark],
  ] as const) {
    it.each(TEXT_PAIRS)(`${mode}: %s on %s is at least 4.5:1`, (fg, bg) => {
      const ratio = contrastRatio(tokens[fg] as string, tokens[bg] as string);
      expect(ratio, `${fg} ${tokens[fg]} on ${bg} ${tokens[bg]}`).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('member colors', () => {
  it('keep initials readable (4.5:1) on every member color', async () => {
    const { MEMBER_COLORS, MEMBER_INK } = await import('./memberColors');
    for (const c of MEMBER_COLORS)
      expect(contrastRatio(MEMBER_INK, c.hex), c.id).toBeGreaterThanOrEqual(4.5);
  });
});
