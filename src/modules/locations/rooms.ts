/**
 * How a place looks: an icon from its name (or stored icon key) and a soft
 * color that stays the same for that place everywhere in the app.
 */
import type { IconName } from '@/components/ui';
import { MEMBER_COLORS } from '@/theme/memberColors';

const BY_WORD: Array<[RegExp, IconName]> = [
  [/kitchen|pantry|cook/, 'pot'],
  [/living|lounge|family|den|sofa/, 'sofa'],
  [/bed|nursery|guest/, 'bed'],
  [/bath|shower|toilet|powder/, 'bath'],
  [/laundry|utility|wash/, 'washer'],
  [/office|study|desk/, 'desk'],
  [/yard|garden|lawn|patio|deck|porch/, 'tree'],
  [/drive|garage|car|parking/, 'car'],
  [/pool|spa|hot tub/, 'wave'],
  [/upstairs|downstairs|floor|level|outside|inside/, 'zone'],
  [/home|house|whole|everywhere/, 'home'],
];

const BY_KEY: Record<string, IconName> = {
  kitchen: 'pot',
  sofa: 'sofa',
  living: 'sofa',
  bed: 'bed',
  bedroom: 'bed',
  bath: 'bath',
  bathroom: 'bath',
  laundry: 'washer',
  office: 'desk',
  yard: 'tree',
  driveway: 'car',
  pool: 'wave',
  home: 'home',
};

export function roomIcon(
  place: { name: string; icon?: string | null; kind?: string } | null | undefined,
): IconName {
  if (!place) return 'home';
  if (place.icon && BY_KEY[place.icon]) return BY_KEY[place.icon] as IconName;
  const n = place.name.toLowerCase();
  for (const [re, icon] of BY_WORD) if (re.test(n)) return icon;
  return place.kind === 'spot' ? 'pin' : place.kind === 'zone' ? 'zone' : 'home';
}

/** A stable soft color per place id (the member palette, so dark ink always reads). */
export function roomColor(id: string | null | undefined): string {
  if (!id) return MEMBER_COLORS[7].hex;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return MEMBER_COLORS[h % MEMBER_COLORS.length]!.hex;
}
