import { describe, expect, it } from 'vitest';
import { MEMBER_COLORS } from '@/theme/memberColors';
import { roomColor, roomIcon } from './rooms';

describe('roomIcon', () => {
  it.each([
    ['Kitchen', 'pot'],
    ['Living room', 'sofa'],
    ['Main bedroom', 'bed'],
    ['Kids bathroom', 'bath'],
    ['Laundry', 'washer'],
    ['Office nook', 'desk'],
    ['Back yard', 'tree'],
    ['Garage', 'car'],
    ['Pool', 'wave'],
    ['Whole home', 'home'],
    ['Attic', 'home'],
  ])('%s → %s', (name, icon) => {
    expect(roomIcon({ name })).toBe(icon);
  });

  it('prefers the stored icon key, and marks spots with a pin', () => {
    expect(roomIcon({ name: 'Cabin', icon: 'bed' })).toBe('bed');
    expect(roomIcon({ name: 'Cabinet 2', kind: 'spot' })).toBe('pin');
    expect(roomIcon(null)).toBe('home');
  });
});

describe('roomColor', () => {
  it('is stable and from the soft palette', () => {
    const hexes = MEMBER_COLORS.map((c) => c.hex as string);
    expect(roomColor('abc')).toBe(roomColor('abc'));
    expect(hexes).toContain(roomColor('abc'));
    expect(hexes).toContain(roomColor(null));
  });
});
