import { describe, expect, it } from 'vitest';
import { formatBytes, inviteLink, inviteStatus } from './logic';
import type { MemberInvite } from './types';

const base: MemberInvite = {
  id: 'i1',
  kind: 'member',
  household_id: 'h1',
  label: null,
  expires_at: '2026-10-04T00:00:00Z',
  max_uses: 1,
  use_count: 0,
  revoked_at: null,
  last_used_at: null,
  created_at: '2026-09-27T00:00:00Z',
  created_household_id: null,
};

describe('invite helpers', () => {
  const now = new Date('2026-09-28T00:00:00Z');
  it('reports status', () => {
    expect(inviteStatus(base, now)).toBe('active');
    expect(inviteStatus({ ...base, use_count: 1 }, now)).toBe('used');
    expect(inviteStatus({ ...base, revoked_at: '2026-09-27T01:00:00Z' }, now)).toBe('revoked');
    expect(inviteStatus(base, new Date('2026-10-05T00:00:00Z'))).toBe('expired');
  });

  it('builds links', () => {
    expect(inviteLink('https://app.example/', 'join', 'ABC')).toBe('https://app.example/join/ABC');
  });

  it('formats byte sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(250 * 1024 * 1024)).toBe('250 MB');
  });
});
