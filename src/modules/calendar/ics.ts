/**
 * RFC 5545 calendar text for the private feed. All events are all-day, so
 * there are no timezone conversions to get wrong.
 */
import { addDays } from '../../lib/dates';
import type { CalEvent } from './events';

export function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Lines longer than 75 bytes continue on the next line after a space. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + n > limit) {
      parts.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

const day = (d: string) => d.replace(/-/g, '');

export function toIcs(
  events: readonly CalEvent[],
  opts: { name: string; siteUrl: string; now: Date; host: string },
): string {
  const stamp = opts.now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Spawnpoint//Household calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(opts.name)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@${opts.host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day(e.start)}`,
      `DTEND;VALUE=DATE:${day(addDays(e.end, 1))}`,
      `SUMMARY:${escapeText(e.title)}`,
      `URL:${opts.siteUrl.replace(/\/$/, '')}${e.path}`,
      'TRANSP:TRANSPARENT',
    );
    if (e.tentative) lines.push('STATUS:TENTATIVE');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
