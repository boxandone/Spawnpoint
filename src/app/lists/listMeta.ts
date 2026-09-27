import type { IconName } from '@/components/ui';
import type { List } from '@/modules/lists/api';

/** Icons a custom list can use. */
export const LIST_ICONS: IconName[] = [
  'lists',
  'gift',
  'map',
  'star',
  'home',
  'calendar',
  'sparkle',
  'leaf',
  'paw',
  'bag',
  'plans',
  'zone',
];

export function listIcon(list: Pick<List, 'kind' | 'icon'>): IconName {
  if (list.kind === 'groceries') return 'cart';
  if (list.kind === 'to_buy') return 'bag';
  if (list.kind === 'todo') return 'check';
  return LIST_ICONS.find((i) => i === list.icon) ?? 'lists';
}
