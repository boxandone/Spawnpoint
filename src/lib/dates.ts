/**
 * Calendar-day helpers. Scheduling works on ISO dates ("2026-09-27") in the
 * household timezone. Arithmetic runs on UTC midnights, so daylight-saving
 * changes can never shift a day. Never use the browser's timezone here.
 */
import { formatInTimeZone } from 'date-fns-tz';

export type IsoDate = string;

const DAY_MS = 86_400_000;

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parts(d: IsoDate): [number, number, number] {
  const [y, m, day] = d.split('-').map(Number);
  return [y as number, m as number, day as number];
}

export function toUtc(d: IsoDate): number {
  const [y, m, day] = parts(d);
  return Date.UTC(y, m - 1, day);
}

export function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function makeDate(year: number, month: number, day: number): IsoDate {
  return fromUtc(Date.UTC(year, month - 1, day));
}

export function addDays(d: IsoDate, n: number): IsoDate {
  return fromUtc(toUtc(d) + n * DAY_MS);
}

/** Whole days from b to a (a − b). */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtc(a) - toUtc(b)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(d: IsoDate): number {
  return new Date(toUtc(d)).getUTCDay();
}

export function yearOf(d: IsoDate): number {
  return parts(d)[0];
}

export function monthOf(d: IsoDate): number {
  return parts(d)[1];
}

export function dayOf(d: IsoDate): number {
  return parts(d)[2];
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function startOfMonth(d: IsoDate): IsoDate {
  return makeDate(yearOf(d), monthOf(d), 1);
}

export function endOfMonth(d: IsoDate): IsoDate {
  return makeDate(yearOf(d), monthOf(d), daysInMonth(yearOf(d), monthOf(d)));
}

export function minDate(a: IsoDate, b: IsoDate): IsoDate {
  return a <= b ? a : b;
}

export function maxDate(a: IsoDate, b: IsoDate): IsoDate {
  return a >= b ? a : b;
}

/** The calendar day it is right now in a timezone. */
export function todayIn(timezone: string, now: Date = new Date()): IsoDate {
  return formatInTimeZone(now, timezone, 'yyyy-MM-dd');
}

/** The calendar day an instant (timestamptz) falls on in a timezone. */
export function dayOfInstant(instant: string | Date, timezone: string): IsoDate {
  return formatInTimeZone(
    typeof instant === 'string' ? new Date(instant) : instant,
    timezone,
    'yyyy-MM-dd',
  );
}

/** Hour of day (0–23) of an instant in a timezone. */
export function hourIn(timezone: string, now: Date = new Date()): number {
  return Number(formatInTimeZone(now, timezone, 'H'));
}

/** Monday-to-Sunday week containing d. */
export function weekBounds(d: IsoDate): { start: IsoDate; end: IsoDate } {
  const offset = (weekdayOf(d) + 6) % 7;
  const start = addDays(d, -offset);
  return { start, end: addDays(start, 6) };
}

/** Inclusive list of dates from a to b. */
export function dateRange(a: IsoDate, b: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = a; d <= b; d = addDays(d, 1)) out.push(d);
  return out;
}

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function weekdayName(i: number, long = false): string {
  return (long ? WEEKDAYS_LONG : WEEKDAYS_SHORT)[((i % 7) + 7) % 7] as string;
}

export function monthName(m: number, long = false): string {
  return (long ? MONTHS_LONG : MONTHS_SHORT)[(m - 1 + 12) % 12] as string;
}

/** "Mon" within the last week, otherwise "Sep 3". */
export function shortDay(d: IsoDate, today: IsoDate): string {
  const ago = diffDays(today, d);
  if (ago >= 0 && ago < 7) return weekdayName(weekdayOf(d));
  if (ago < 0 && ago > -7) return weekdayName(weekdayOf(d));
  return `${monthName(monthOf(d))} ${dayOf(d)}`;
}

/** "Sep 3" or "Sep 3, 2025" if it's another year. */
export function mediumDate(d: IsoDate, today: IsoDate): string {
  const base = `${monthName(monthOf(d))} ${dayOf(d)}`;
  return yearOf(d) === yearOf(today) ? base : `${base}, ${yearOf(d)}`;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0] || 'th');
}
