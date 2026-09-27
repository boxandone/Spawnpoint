import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { translate } from './copy';
import { levelTitle } from './levels';
import { THEME_PACKS } from './registry';
import { ThemeScope } from './ThemeProvider';
import { useCopy } from './useCopy';

function Word({ k }: { k: Parameters<typeof translate>[1] }) {
  const t = useCopy();
  return <span>{t(k, { day: 'Mon' })}</span>;
}

describe('useCopy', () => {
  it('uses the scope’s pack and falls back to Classic for missing keys', () => {
    render(
      <>
        <ThemeScope themeId="classic" mode="light">
          <Word k="task.completeToast" />
        </ThemeScope>
        <ThemeScope themeId="squad-hq" mode="dark">
          <Word k="task.completeToast" />
          <Word k="common.undo" />
          <Word k="task.waiting" />
        </ThemeScope>
      </>,
    );
    expect(screen.getByText('Nice, that’s done!')).toBeInTheDocument();
    expect(screen.getByText('Mission complete!')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument(); // Classic fallback
    expect(screen.getByText('On standby since Mon')).toBeInTheDocument();
  });

  it('leaves unknown variables visible instead of blank', () => {
    expect(translate({}, 'task.waiting')).toBe('Waiting since {day}');
  });
});

describe('theme packs', () => {
  it.each(THEME_PACKS.map((p) => [p.id, p] as const))('%s is complete', (_id, pack) => {
    expect(pack.avatars).toHaveLength(12);
    expect(new Set(pack.avatars.map((a) => a.id)).size).toBe(12);
    for (const a of pack.avatars) expect(a.id.startsWith(`${pack.id}/`)).toBe(true);
    expect(pack.levelTitles).toHaveLength(6);
    expect(pack.patterns.opacity).toBeLessThanOrEqual(0.06);
    for (const ev of ['taskComplete', 'badgeEarned', 'levelUp', 'meterFull'] as const) {
      expect(typeof pack.celebrate[ev].full).toBe('function');
      expect(typeof pack.celebrate[ev].reduced).toBe('function');
    }
  });

  it('maps level bands to titles', () => {
    const titles = THEME_PACKS[0]!.levelTitles;
    expect(levelTitle(titles, 1)).toBe('Newcomer');
    expect(levelTitle(titles, 4)).toBe('Newcomer');
    expect(levelTitle(titles, 5)).toBe('Regular');
    expect(levelTitle(titles, 20)).toBe('Keeper');
    expect(levelTitle(titles, 99)).toBe('Legend');
  });
});
