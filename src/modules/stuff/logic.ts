/**
 * Pure Stuff rules: tags, search, warranty watch, scanning, label sheets, and
 * file paths. No React, no Supabase.
 */
import { addDays, diffDays, type IsoDate } from '@/lib/dates';

export const ITEM_CATEGORIES = [
  'electronics',
  'appliance',
  'networking',
  'furniture',
  'tools',
  'outdoor',
  'other',
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const ITEM_STATUSES = ['active', 'lent', 'sold', 'donated', 'disposed'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const DOC_KINDS = ['receipt', 'manual', 'warranty', 'photo', 'other'] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** "Kitchen, small appliance , kitchen" → ["Kitchen", "small appliance"]. */
export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[,\n#]/)) {
    const tag = raw.trim().replace(/\s+/g, ' ').slice(0, 40);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length === 20) break;
  }
  return out;
}

export interface SearchableItem {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  tags: string[];
  spot: string | null;
  location_id: string | null;
  barcode?: string | null;
}

/**
 * "Where is…": every word you type must match the name, tags, brand, model,
 * spot, or location. Name matches rank first.
 */
export function searchItems<T extends SearchableItem>(
  items: readonly T[],
  query: string,
  locationName: (id: string | null) => string | null,
): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...items];
  const scored: Array<{ item: T; score: number }> = [];
  for (const item of items) {
    const name = item.name.toLowerCase();
    const hay = [
      name,
      item.brand,
      item.model,
      item.spot,
      locationName(item.location_id),
      item.barcode,
      ...item.tags,
    ]
      .filter(Boolean)
      .join(' \u0001 ')
      .toLowerCase();
    if (!words.every((w) => hay.includes(w))) continue;
    let score = 0;
    for (const w of words) {
      if (name.startsWith(w)) score += 3;
      else if (name.split(/\s+/).some((p) => p.startsWith(w))) score += 2;
      else if (name.includes(w)) score += 1;
    }
    scored.push({ item, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .map((s) => s.item);
}

export interface WarrantyItem {
  id: string;
  warranty_until: string | null;
  status: string;
  archived_at: string | null;
}

/** Warranties ending in the next `days` days (today included), soonest first. */
export function warrantyWatch<T extends WarrantyItem>(
  items: readonly T[],
  today: IsoDate,
  days = 60,
): Array<{ item: T; daysLeft: number }> {
  const end = addDays(today, days);
  return items
    .filter(
      (i) =>
        !i.archived_at &&
        (i.status === 'active' || i.status === 'lent') &&
        i.warranty_until !== null &&
        i.warranty_until >= today &&
        i.warranty_until <= end,
    )
    .map((item) => ({ item, daysLeft: diffDays(item.warranty_until as string, today) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Read a code the forgiving way: case-insensitive, I/L → 1, O → 0, no dashes. */
export function normalizeCode(text: string): string | null {
  const c = text.toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
  if (c.length !== 8) return null;
  return [...c].every((ch) => CODE_ALPHABET.includes(ch)) ? c : null;
}

export type ScanResult =
  | { kind: 'code'; code: string }
  | { kind: 'barcode'; value: string }
  | { kind: 'other'; text: string };

/**
 * What a scan means. Our labels are URLs ending in /s/{code}; a bare 8-character
 * code works too. Anything else that looks like a product barcode is matched
 * against items. Other URLs are never followed.
 */
export function parseScan(text: string): ScanResult {
  const t = text.trim();
  const url = t.match(/^https?:\/\/[^/\s]+\/s\/([0-9A-Za-z-]{8,9})\/?$/);
  if (url) {
    const code = normalizeCode(url[1] as string);
    if (code) return { kind: 'code', code };
  }
  if (/^[0-9]{6,14}$/.test(t)) return { kind: 'barcode', value: t };
  const bare = /^[0-9A-Za-z-]{8,9}$/.test(t) ? normalizeCode(t) : null;
  if (bare && /[A-Za-z]/.test(t)) return { kind: 'code', code: bare };
  if (/^[0-9A-Za-z.-]{4,64}$/.test(t)) return { kind: 'barcode', value: t };
  return { kind: 'other', text: t };
}

export function labelUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, '')}/s/${code}`;
}

export interface LabelStock {
  id: 'address30' | 'square2';
  columns: number;
  rows: number;
  /** CSS lengths for one label, and the sheet's margins and gaps (US Letter). */
  width: string;
  height: string;
  marginTop: string;
  marginLeft: string;
  gapX: string;
  gapY: string;
}

/** Two common label sheet layouts, both on US Letter. */
export const LABEL_STOCKS: readonly LabelStock[] = [
  {
    id: 'address30',
    columns: 3,
    rows: 10,
    width: '2.625in',
    height: '1in',
    marginTop: '0.5in',
    marginLeft: '0.1875in',
    gapX: '0.125in',
    gapY: '0in',
  },
  {
    id: 'square2',
    columns: 3,
    rows: 4,
    width: '2in',
    height: '2in',
    marginTop: '0.75in',
    marginLeft: '0.875in',
    gapX: '0.5in',
    gapY: '0.5in',
  },
];

/**
 * Lay labels onto sheets. `skip` leaves the first spots on the first sheet
 * empty, so a half-used sheet can go back in the printer.
 */
export function paginateLabels<T>(
  labels: readonly T[],
  perSheet: number,
  skip = 0,
): Array<Array<T | null>> {
  const start = Math.max(0, Math.min(perSheet - 1, Math.floor(skip)));
  const cells: Array<T | null> = [...Array<null>(start).fill(null), ...labels];
  const sheets: Array<Array<T | null>> = [];
  for (let i = 0; i < cells.length; i += perSheet) {
    const sheet = cells.slice(i, i + perSheet);
    while (sheet.length < perSheet) sheet.push(null);
    sheets.push(sheet);
  }
  return sheets;
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
};

export function extensionFor(mime: string): string | null {
  return EXT[mime] ?? null;
}

/** `{household}/{item | plan-{plan} | household}/{id}.{ext}`, matching the database check. */
export function documentPaths(
  householdId: string,
  owner: { itemId?: string | null; planId?: string | null },
  documentId: string,
  mime: string,
  withThumb: boolean,
): { path: string; thumb: string | null } | null {
  const ext = extensionFor(mime);
  if (!ext) return null;
  const folder = `${householdId}/${owner.itemId ?? (owner.planId ? `plan-${owner.planId}` : 'household')}`;
  return {
    path: `${folder}/${documentId}.${ext}`,
    thumb: withThumb ? `${folder}/${documentId}_thumb.jpg` : null,
  };
}

/** Scale (w, h) to fit inside max × max, never enlarging. */
export function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export interface ItemPrefill {
  name: string;
  price: number | null;
  purchased_on: IsoDate | null;
  location_id: string | null;
  notes: string | null;
  url: string | null;
}

/** "Bought → Add to Stuff": carry over what the To buy entry already knows. */
export function prefillFromToBuy(entry: {
  name: string;
  target_price: number | null;
  bought_on: string | null;
  location_id: string | null;
  notes: string | null;
  links: string[];
}): ItemPrefill {
  return {
    name: entry.name,
    price: entry.target_price,
    purchased_on: entry.bought_on,
    location_id: entry.location_id,
    notes: entry.notes,
    url: entry.links[0] ?? null,
  };
}
