import { describe, expect, it } from 'vitest';
import { parseInvite } from './pending';

describe('parseInvite', () => {
  it('reads codes out of links', () => {
    expect(parseInvite('https://spawnpoint.example/join/abcd2345efgh')).toEqual({
      kind: 'join',
      code: 'ABCD2345EFGH',
    });
    expect(parseInvite('  https://x.example/start/ZZZZ9999AAAA?utm=1 ')).toEqual({
      kind: 'start',
      code: 'ZZZZ9999AAAA',
    });
  });

  it('accepts a bare code with spaces or dashes', () => {
    expect(parseInvite('abcd-2345-efgh')).toEqual({ kind: 'unknown', code: 'ABCD2345EFGH' });
  });

  it('ignores junk', () => {
    expect(parseInvite('')).toBeNull();
    expect(parseInvite('hi')).toBeNull();
  });
});
