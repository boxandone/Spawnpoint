import type { IconName } from '@/components/ui';
import { memberColor } from '@/theme/memberColors';
import type { Plan } from '@/modules/plans/api';

export const PLAN_ICONS: IconName[] = [
  'plans',
  'map',
  'calendar',
  'home',
  'star',
  'gift',
  'sparkle',
  'leaf',
  'paw',
  'bag',
  'wrench',
  'bolt',
];

const TYPE_ICON: Record<string, IconName> = {
  trip: 'map',
  project: 'wrench',
  decision: 'chat',
  event: 'calendar',
};

export function planIcon(plan: Pick<Plan, 'icon' | 'type'>): IconName {
  return PLAN_ICONS.find((i) => i === plan.icon) ?? TYPE_ICON[plan.type] ?? 'plans';
}

/** Plan colors reuse the soft member palette, so dark ink always reads on them. */
export function planColor(plan: Pick<Plan, 'color'>): string {
  return memberColor(plan.color ?? 'sky');
}
