/**
 * The location tree (zone > area > spot) and the setup wizard's area templates.
 */

export type LocationKind = 'zone' | 'area' | 'spot';

export interface LocationLike {
  id: string;
  parent_id: string | null;
  kind: LocationKind;
  name: string;
  sort: number;
  archived_at?: string | null;
}

/** Canonical areas the starter library points at. */
export type AreaKey =
  | 'kitchen'
  | 'living'
  | 'office'
  | 'bedroom'
  | 'bathroom'
  | 'laundry'
  | 'yard'
  | 'driveway'
  | 'pool'
  | 'home';

export type TemplateId = 'house' | 'apartment' | 'custom';

export interface TemplateArea {
  key: AreaKey;
  name: string;
  zone?: string;
  /** Unchecked by default in the wizard (not every home has one). */
  optional?: boolean;
}

export const AREA_TEMPLATES: Record<TemplateId, TemplateArea[]> = {
  house: [
    { key: 'kitchen', name: 'Kitchen', zone: 'Downstairs' },
    { key: 'living', name: 'Living room', zone: 'Downstairs' },
    { key: 'office', name: 'Office', zone: 'Downstairs', optional: true },
    { key: 'laundry', name: 'Laundry', zone: 'Downstairs' },
    { key: 'bedroom', name: 'Main bedroom', zone: 'Upstairs' },
    { key: 'bathroom', name: 'Bathroom', zone: 'Upstairs' },
    { key: 'yard', name: 'Yard', zone: 'Outside' },
    { key: 'driveway', name: 'Driveway', zone: 'Outside' },
    { key: 'pool', name: 'Pool', zone: 'Outside', optional: true },
    { key: 'home', name: 'Whole home' },
  ],
  apartment: [
    { key: 'kitchen', name: 'Kitchen' },
    { key: 'living', name: 'Living room' },
    { key: 'bedroom', name: 'Bedroom' },
    { key: 'bathroom', name: 'Bathroom' },
    { key: 'laundry', name: 'Laundry', optional: true },
    { key: 'office', name: 'Office nook', optional: true },
    { key: 'home', name: 'Whole home' },
  ],
  custom: [{ key: 'home', name: 'Whole home' }],
};

/** Where a library template lands when its own area wasn't picked. */
const FALLBACK: Partial<Record<AreaKey, AreaKey>> = {
  office: 'living',
  driveway: 'yard',
  laundry: 'home',
};

/**
 * Resolve a library area to one of the picked areas, or null if the home has
 * nowhere sensible for it (a pool task in an apartment).
 */
export function resolveArea(key: AreaKey, picked: ReadonlySet<AreaKey>): AreaKey | null {
  let k: AreaKey | undefined = key;
  const seen = new Set<AreaKey>();
  while (k && !seen.has(k)) {
    if (picked.has(k)) return k;
    seen.add(k);
    k = FALLBACK[k];
  }
  return null;
}

/** id → [id, parent, grandparent…]. Cycles are cut off. */
export function makeAncestry(locations: LocationLike[]): (id: string) => string[] {
  const byId = new Map(locations.map((l) => [l.id, l]));
  const cache = new Map<string, string[]>();
  return (id: string) => {
    const hit = cache.get(id);
    if (hit) return hit;
    const chain: string[] = [];
    let cur = byId.get(id);
    if (!cur) chain.push(id);
    while (cur && !chain.includes(cur.id)) {
      chain.push(cur.id);
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
    cache.set(id, chain);
    return chain;
  };
}

export interface LocationNode<L extends LocationLike = LocationLike> {
  location: L;
  children: LocationNode<L>[];
}

export function buildTree<L extends LocationLike>(locations: L[]): LocationNode<L>[] {
  const live = locations.filter((l) => !l.archived_at);
  const nodes = new Map(
    live.map((l) => [l.id, { location: l, children: [] as LocationNode<L>[] }]),
  );
  const roots: LocationNode<L>[] = [];
  for (const node of nodes.values()) {
    const parent = node.location.parent_id ? nodes.get(node.location.parent_id) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const sort = (list: LocationNode<L>[]) => {
    list.sort(
      (a, b) => a.location.sort - b.location.sort || a.location.name.localeCompare(b.location.name),
    );
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

/** Areas in display order, each with the zone it sits in (if any). */
export function listAreas<L extends LocationLike>(
  locations: L[],
): Array<{ area: L; zone: L | null }> {
  const out: Array<{ area: L; zone: L | null }> = [];
  for (const root of buildTree(locations)) {
    if (root.location.kind === 'area') out.push({ area: root.location, zone: null });
    for (const child of root.children) {
      if (root.location.kind === 'zone' && child.location.kind === 'area') {
        out.push({ area: child.location, zone: root.location });
      }
    }
  }
  return out;
}

/** "Kitchen" or "Kitchen › Under-sink cabinet". */
export function locationLabel(id: string | null, locations: LocationLike[]): string | null {
  if (!id) return null;
  const byId = new Map(locations.map((l) => [l.id, l]));
  const loc = byId.get(id);
  if (!loc) return null;
  if (loc.kind === 'spot' && loc.parent_id) {
    const parent = byId.get(loc.parent_id);
    if (parent) return `${parent.name} › ${loc.name}`;
  }
  return loc.name;
}

/** The area a location belongs to (itself if it's an area; its parent if a spot). */
export function areaOf(id: string | null, locations: LocationLike[]): string | null {
  if (!id) return null;
  const byId = new Map(locations.map((l) => [l.id, l]));
  let cur = byId.get(id);
  while (cur && cur.kind === 'spot' && cur.parent_id) cur = byId.get(cur.parent_id);
  return cur && cur.kind === 'area' ? cur.id : null;
}
