import type { MemberInvite } from './types';

export type InviteStatus = 'active' | 'used' | 'expired' | 'revoked';

export function inviteStatus(invite: MemberInvite, now: Date = new Date()): InviteStatus {
  if (invite.revoked_at) return 'revoked';
  if (invite.use_count >= invite.max_uses) return 'used';
  if (new Date(invite.expires_at) <= now) return 'expired';
  return 'active';
}

export function inviteLink(origin: string, kind: 'start' | 'join', code: string): string {
  return `${origin.replace(/\/$/, '')}/${kind}/${code}`;
}

/** A readable byte size: 0 B, 12 KB, 3.4 MB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

/** Common timezones for the picker, plus the browser's own guess first. */
export function timezoneOptions(guess?: string): string[] {
  let all: string[] = [];
  try {
    all =
      (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.(
        'timeZone',
      ) ?? [];
  } catch {
    all = [];
  }
  if (all.length === 0)
    all = [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Australia/Sydney',
    ];
  return guess && !all.includes(guess) ? [guess, ...all] : all;
}

export function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
