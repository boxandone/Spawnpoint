/**
 * Pure list rules: category guessing, quick-add parsing, ordering, store-mode
 * grouping, and suggestions. No React, no Supabase.
 */

export const CATEGORIES = [
  'produce',
  'dairy',
  'meat',
  'bakery',
  'pantry',
  'frozen',
  'drinks',
  'household',
  'pets',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}

/** A small keyword map; see guessCategory for how matches are picked. */
const KEYWORDS: Array<[Category, string[]]> = [
  [
    'frozen',
    [
      'frozen',
      'ice cream',
      'popsicle',
      'ice pop',
      'fish sticks',
      'waffles',
      'tater tots',
      'bag of ice',
    ],
  ],
  [
    'pets',
    [
      'dog food',
      'cat food',
      'kibble',
      'litter',
      'treats',
      'chew',
      'flea',
      'bird seed',
      'fish food',
      'pet',
    ],
  ],
  [
    'household',
    [
      'paper towel',
      'toilet paper',
      'tissue',
      'napkin',
      'detergent',
      'dish soap',
      'soap',
      'sponge',
      'trash bag',
      'garbage bag',
      'bleach',
      'cleaner',
      'foil',
      'plastic wrap',
      'batteries',
      'light bulb',
      'shampoo',
      'conditioner',
      'toothpaste',
      'toothbrush',
      'deodorant',
      'razor',
      'lotion',
      'diapers',
      'wipes',
      'dryer sheets',
      'softener',
    ],
  ],
  [
    'drinks',
    [
      'coffee',
      'tea',
      'juice',
      'soda',
      'water',
      'sparkling',
      'beer',
      'wine',
      'kombucha',
      'lemonade',
      'seltzer',
      'energy drink',
    ],
  ],
  [
    'dairy',
    [
      'milk',
      'cheese',
      'yogurt',
      'yoghurt',
      'butter',
      'cream',
      'eggs',
      'egg',
      'sour cream',
      'cottage',
      'kefir',
      'half and half',
    ],
  ],
  [
    'meat',
    [
      'chicken',
      'beef',
      'pork',
      'turkey',
      'bacon',
      'sausage',
      'ham',
      'steak',
      'ground beef',
      'ground turkey',
      'salmon',
      'tuna steak',
      'shrimp',
      'fish',
      'lamb',
      'tofu',
      'deli',
      'hot dogs',
    ],
  ],
  [
    'bakery',
    [
      'bread',
      'bagel',
      'bun',
      'roll',
      'tortilla',
      'pita',
      'croissant',
      'muffin',
      'cake',
      'baguette',
    ],
  ],
  [
    'produce',
    [
      'apple',
      'banana',
      'orange',
      'lemon',
      'lime',
      'grape',
      'berries',
      'berry',
      'strawberr',
      'blueberr',
      'avocado',
      'tomato',
      'potato',
      'onion',
      'garlic',
      'lettuce',
      'spinach',
      'kale',
      'carrot',
      'celery',
      'cucumber',
      'pepper',
      'broccoli',
      'cauliflower',
      'zucchini',
      'mushroom',
      'herbs',
      'cilantro',
      'basil',
      'parsley',
      'ginger',
      'pear',
      'peach',
      'plum',
      'melon',
      'mango',
      'pineapple',
      'salad',
      'fruit',
      'veg',
    ],
  ],
  [
    'pantry',
    [
      'rice',
      'pasta',
      'noodle',
      'flour',
      'sugar',
      'salt',
      'oil',
      'vinegar',
      'cereal',
      'oats',
      'oatmeal',
      'beans',
      'lentils',
      'soup',
      'broth',
      'chicken broth',
      'chicken stock',
      'stock',
      'sauce',
      'ketchup',
      'mustard',
      'mayo',
      'peanut butter',
      'jam',
      'honey',
      'syrup',
      'spice',
      'crackers',
      'chips',
      'cookies',
      'snack',
      'nuts',
      'canned',
      'tuna',
      'baking',
      'yeast',
    ],
  ],
];

/**
 * Guess a grocery category from the item name. The last matching phrase wins,
 * since the noun usually comes last ("orange juice" is a drink), and a longer
 * phrase wins a tie ("peanut butter" isn't dairy). "Frozen" always wins.
 * Unknown words fall back to "other".
 */
export function guessCategory(name: string): Category {
  const n = ` ${name
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')} `;
  if (n.includes(' frozen ')) return 'frozen';
  let best: { category: Category; end: number; len: number } | null = null;
  for (const [category, words] of KEYWORDS) {
    for (const w of words) {
      const at = n.lastIndexOf(` ${w}`);
      if (at < 0) continue;
      const end = at + w.length;
      if (!best || end > best.end || (end === best.end && w.length > best.len)) {
        best = { category, end, len: w.length };
      }
    }
  }
  return best?.category ?? 'other';
}

const UNITS = [
  'x',
  'lb',
  'lbs',
  'oz',
  'kg',
  'g',
  'l',
  'ml',
  'gal',
  'pack',
  'packs',
  'dozen',
  'doz',
  'bag',
  'bags',
  'box',
  'boxes',
  'can',
  'cans',
  'jar',
  'jars',
  'bottle',
  'bottles',
  'bunch',
];

/**
 * "2 milk" → { name: "milk", quantity: "2" }; "3 lb chicken" keeps the unit;
 * "eggs x12" → quantity "12". Anything else is just a name.
 */
export function parseQuickAdd(text: string): { name: string; quantity: string | null } {
  const clean = text.trim().replace(/\s+/g, ' ');
  const lead = clean.match(/^(\d+(?:[.,/]\d+)?)\s*([a-z]+)?\s+(.+)$/i);
  if (lead) {
    const [, num, unit, rest] = lead as unknown as [string, string, string | undefined, string];
    if (unit && UNITS.includes(unit.toLowerCase())) {
      const u = unit.toLowerCase() === 'x' ? '' : ` ${unit}`;
      return { name: rest, quantity: `${num}${u}` };
    }
    if (!unit) return { name: rest, quantity: num };
    return { name: `${unit} ${rest}`, quantity: num };
  }
  const trail = clean.match(/^(.+?)\s*(?:x\s*(\d+)|\((\d+)\))$/i);
  if (trail && (trail[2] || trail[3])) {
    return { name: trail[1] as string, quantity: (trail[2] ?? trail[3]) as string };
  }
  return { name: clean, quantity: null };
}

/** For duplicate checks and suggestion matching. */
export function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

interface Positioned {
  id: string;
  position: number;
}

/** Quick-add puts new items at the top. */
export function topPosition(items: readonly Positioned[]): number {
  if (items.length === 0) return 0;
  return Math.min(...items.map((i) => i.position)) - 1;
}

export function bottomPosition(items: readonly Positioned[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((i) => i.position)) + 1;
}

/**
 * The new position for the item moved from index `from` to index `to` in
 * `ordered` (already sorted by position). Only the moved item changes.
 */
export function positionForMove(ordered: readonly Positioned[], from: number, to: number): number {
  const moved = ordered[from];
  if (!moved) return 0;
  const rest = ordered.filter((_, i) => i !== from);
  const target = Math.max(0, Math.min(to, rest.length));
  const before = rest[target - 1];
  const after = rest[target];
  if (!before && !after) return moved.position;
  if (!before) return (after as Positioned).position - 1;
  if (!after) return before.position + 1;
  return (before.position + after.position) / 2;
}

export function byPosition<T extends Positioned>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

/** Store mode: groups in aisle order, empty groups left out. */
export function groupByCategory<
  T extends { category: string | null; position: number; id: string },
>(items: readonly T[]): Array<{ category: Category; items: T[] }> {
  const groups = new Map<Category, T[]>();
  for (const item of byPosition(items)) {
    const c = isCategory(item.category) ? item.category : 'other';
    groups.set(c, [...(groups.get(c) ?? []), item]);
  }
  return CATEGORIES.filter((c) => groups.has(c)).map((c) => ({
    category: c,
    items: groups.get(c) as T[],
  }));
}

export interface Suggestion {
  name: string;
  quantity: string | null;
  category: string | null;
  staple?: boolean;
}

/**
 * Suggestions for the quick-add box: staples and past purchases whose words
 * start with what you typed, skipping anything already waiting on the list.
 */
export function matchSuggestions(
  query: string,
  pool: readonly Suggestion[],
  onList: readonly string[],
  limit = 5,
): Suggestion[] {
  const q = nameKey(query);
  if (q.length < 1) return [];
  const taken = new Set(onList.map(nameKey));
  const seen = new Set<string>();
  const starts: Suggestion[] = [];
  const words: Suggestion[] = [];
  for (const s of pool) {
    const k = nameKey(s.name);
    if (taken.has(k) || seen.has(k) || k === q) continue;
    seen.add(k);
    if (k.startsWith(q)) starts.push(s);
    else if (k.split(' ').some((w) => w.startsWith(q))) words.push(s);
  }
  return [...starts, ...words].slice(0, limit);
}

export type BuyStatus = 'idea' | 'to_buy' | 'bought';
export const BUY_STATUSES: readonly BuyStatus[] = ['idea', 'to_buy', 'bought'];

export function isBuyStatus(value: unknown): value is BuyStatus {
  return typeof value === 'string' && (BUY_STATUSES as readonly string[]).includes(value);
}

/** One tap moves an idea forward: idea → to buy → bought. */
export function nextBuyStatus(status: string | null): BuyStatus {
  if (status === 'idea') return 'to_buy';
  if (status === 'to_buy') return 'bought';
  return 'bought';
}

const PRIORITY_RANK: Record<string, number> = { high: 0, normal: 1, low: 2 };

/** To buy: by status (to buy, ideas, then bought), then priority, then position. */
export function sortToBuy<T extends Positioned & { status: string | null; priority: string }>(
  items: readonly T[],
): T[] {
  const statusRank = (s: string | null) => (s === 'to_buy' ? 0 : s === 'idea' ? 1 : 2);
  return [...items].sort(
    (a, b) =>
      statusRank(a.status) - statusRank(b.status) ||
      (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) ||
      a.position - b.position ||
      a.id.localeCompare(b.id),
  );
}

/** Links must be http(s), like the database check. */
export function isValidLink(url: string): boolean {
  return /^https?:\/\/\S+$/i.test(url.trim()) && url.trim().length <= 500;
}

/** Split pasted text into links, one per line or separated by spaces. */
export function parseLinks(text: string): { links: string[]; invalid: string[] } {
  const parts = text
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    links: parts.filter(isValidLink).slice(0, 5),
    invalid: parts.filter((p) => !isValidLink(p)),
  };
}

/** A short host name for showing a link, like "example.com". */
export function linkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Parse a price the way people type it: "$1,299.99" → 1299.99. */
export function parsePrice(text: string): number | null {
  const n = Number(text.replace(/[^0-9.]/g, ''));
  if (!/\d/.test(text) || !Number.isFinite(n) || n < 0 || n >= 10_000_000) return null;
  return Math.round(n * 100) / 100;
}
