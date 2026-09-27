/**
 * The universal deed catalog (docs/SPEC.md Appendix B).
 *
 * KEYS ARE PERMANENT. Add new deeds freely; never rename or remove a key,
 * because completions, badges, and conversations ("gold in valves") use them.
 *
 * Phase 2 builds XP, cooldowns, and badges on top of this data.
 */
export type DeedCategory =
  | 'plumbing'
  | 'water'
  | 'systems'
  | 'safety'
  | 'appliances'
  | 'repairs'
  | 'outside'
  | 'pool'
  | 'pets'
  | 'organizing';

export type DeedApplies = 'any' | 'house' | 'yard' | 'pool' | 'pets';

export interface Deed {
  key: string;
  name: string;
  category: DeedCategory;
  xp: number;
  /** Days before logging it again earns XP. null = no cooldown (task XP only). */
  cooldownDays: number | null;
  /** Bronze, silver, gold thresholds, in logs or in units. */
  tiers: readonly [number, number, number];
  unit?: string;
  applies: DeedApplies;
}

export const DEEDS = [
  // Plumbing and water
  {
    key: 'toilet_flapper',
    name: 'Fixed a running toilet',
    category: 'plumbing',
    xp: 40,
    cooldownDays: 30,
    tiers: [1, 3, 10],
    applies: 'any',
  },
  {
    key: 'drain_unclog',
    name: 'Unclogged a drain',
    category: 'plumbing',
    xp: 30,
    cooldownDays: 7,
    tiers: [1, 5, 15],
    applies: 'any',
  },
  {
    key: 'faucet_fix',
    name: 'Fixed a leaky faucet',
    category: 'plumbing',
    xp: 40,
    cooldownDays: 30,
    tiers: [1, 3, 10],
    applies: 'any',
  },
  {
    key: 'valve_exercise',
    name: 'Exercised shutoff valves',
    category: 'water',
    xp: 20,
    cooldownDays: 60,
    tiers: [10, 50, 150],
    unit: 'valves',
    applies: 'any',
  },
  {
    key: 'spigot_winterize',
    name: 'Winterized outdoor spigots',
    category: 'water',
    xp: 20,
    cooldownDays: 180,
    tiers: [1, 3, 5],
    applies: 'house',
  },
  {
    key: 'water_heater_flush',
    name: 'Flushed the water heater',
    category: 'water',
    xp: 50,
    cooldownDays: 180,
    tiers: [1, 3, 5],
    applies: 'house',
  },
  {
    key: 'recaulk',
    name: 'Re-caulked a tub, shower, or sink',
    category: 'plumbing',
    xp: 40,
    cooldownDays: 90,
    tiers: [1, 3, 8],
    applies: 'any',
  },
  // Heating, air, and safety
  {
    key: 'hvac_filter',
    name: 'Replaced an HVAC filter',
    category: 'systems',
    xp: 20,
    cooldownDays: 20,
    tiers: [3, 12, 36],
    unit: 'filters',
    applies: 'any',
  },
  {
    key: 'alarm_test',
    name: 'Tested smoke and CO alarms',
    category: 'safety',
    xp: 10,
    cooldownDays: 25,
    tiers: [3, 12, 36],
    applies: 'any',
  },
  {
    key: 'alarm_batteries',
    name: 'Replaced alarm batteries',
    category: 'safety',
    xp: 20,
    cooldownDays: 180,
    tiers: [1, 3, 5],
    applies: 'any',
  },
  {
    key: 'dryer_vent',
    name: 'Cleaned the dryer vent duct',
    category: 'safety',
    xp: 50,
    cooldownDays: 180,
    tiers: [1, 3, 5],
    applies: 'any',
  },
  {
    key: 'fire_extinguisher',
    name: 'Checked the fire extinguisher',
    category: 'safety',
    xp: 10,
    cooldownDays: 180,
    tiers: [1, 4, 10],
    applies: 'any',
  },
  // Appliances
  {
    key: 'fridge_coils',
    name: 'Vacuumed fridge coils',
    category: 'appliances',
    xp: 30,
    cooldownDays: 90,
    tiers: [1, 4, 10],
    applies: 'any',
  },
  {
    key: 'dishwasher_filter',
    name: 'Cleaned the dishwasher filter',
    category: 'appliances',
    xp: 10,
    cooldownDays: 20,
    tiers: [3, 12, 36],
    applies: 'any',
  },
  {
    key: 'range_hood_filter',
    name: 'Cleaned the range hood filter',
    category: 'appliances',
    xp: 15,
    cooldownDays: 20,
    tiers: [3, 12, 36],
    applies: 'any',
  },
  {
    key: 'washer_clean',
    name: 'Ran a washer clean cycle',
    category: 'appliances',
    xp: 10,
    cooldownDays: 20,
    tiers: [3, 12, 36],
    applies: 'any',
  },
  {
    key: 'oven_deep_clean',
    name: 'Deep cleaned the oven',
    category: 'appliances',
    xp: 40,
    cooldownDays: 60,
    tiers: [1, 4, 10],
    applies: 'any',
  },
  // Repairs and upgrades
  {
    key: 'drywall_patch',
    name: 'Patched drywall',
    category: 'repairs',
    xp: 40,
    cooldownDays: 14,
    tiers: [1, 5, 15],
    applies: 'any',
  },
  {
    key: 'light_fixture',
    name: 'Installed or replaced a light fixture',
    category: 'repairs',
    xp: 50,
    cooldownDays: 7,
    tiers: [1, 5, 15],
    applies: 'any',
  },
  {
    key: 'door_fix',
    name: 'Fixed a sticking door or loose hinge',
    category: 'repairs',
    xp: 30,
    cooldownDays: 14,
    tiers: [1, 5, 15],
    applies: 'any',
  },
  {
    key: 'furniture_assembly',
    name: 'Assembled furniture',
    category: 'repairs',
    xp: 30,
    cooldownDays: 1,
    tiers: [1, 10, 25],
    applies: 'any',
  },
  {
    key: 'appliance_install',
    name: 'Installed an appliance or device (TV, router, and so on)',
    category: 'repairs',
    xp: 40,
    cooldownDays: 1,
    tiers: [1, 5, 15],
    applies: 'any',
  },
  // Outside
  {
    key: 'gutters',
    name: 'Cleared the gutters',
    category: 'outside',
    xp: 60,
    cooldownDays: 90,
    tiers: [1, 3, 8],
    applies: 'house',
  },
  {
    key: 'pressure_wash',
    name: 'Pressure washed',
    category: 'outside',
    xp: 50,
    cooldownDays: 60,
    tiers: [1, 4, 10],
    applies: 'yard',
  },
  {
    key: 'hedge_trim',
    name: 'Trimmed hedges and shrubs',
    category: 'outside',
    xp: 40,
    cooldownDays: 30,
    tiers: [1, 5, 15],
    applies: 'yard',
  },
  {
    key: 'sprinkler_fix',
    name: 'Fixed a sprinkler head',
    category: 'outside',
    xp: 30,
    cooldownDays: 7,
    tiers: [1, 5, 15],
    applies: 'yard',
  },
  {
    key: 'planted_something',
    name: 'Planted something',
    category: 'outside',
    xp: 20,
    cooldownDays: 7,
    tiers: [1, 10, 30],
    applies: 'any',
  },
  // Pool
  {
    key: 'pool_chemistry',
    name: 'Balanced pool chemistry',
    category: 'pool',
    xp: 10,
    cooldownDays: 2,
    tiers: [10, 50, 150],
    applies: 'pool',
  },
  {
    key: 'pool_filter_deep_clean',
    name: 'Deep cleaned the pool filter',
    category: 'pool',
    xp: 60,
    cooldownDays: 90,
    tiers: [1, 3, 8],
    applies: 'pool',
  },
  // Pets
  {
    key: 'litter_duty',
    name: 'Litter duty',
    category: 'pets',
    xp: 0,
    cooldownDays: null,
    tiers: [30, 150, 500],
    applies: 'pets',
  },
  {
    key: 'pet_bath',
    name: 'Bathed a pet',
    category: 'pets',
    xp: 20,
    cooldownDays: 7,
    tiers: [1, 10, 30],
    applies: 'pets',
  },
  // Organizing
  {
    key: 'closet_reset',
    name: 'Organized a closet or cabinet',
    category: 'organizing',
    xp: 30,
    cooldownDays: 7,
    tiers: [1, 5, 20],
    applies: 'any',
  },
  {
    key: 'garage_reset',
    name: 'Organized the garage',
    category: 'organizing',
    xp: 60,
    cooldownDays: 30,
    tiers: [1, 3, 8],
    applies: 'house',
  },
] as const satisfies readonly Deed[];

export type DeedKey = (typeof DEEDS)[number]['key'];

const byKey = new Map<string, Deed>(DEEDS.map((d) => [d.key, d]));

export function getDeed(key: string | null | undefined): Deed | undefined {
  return key ? byKey.get(key) : undefined;
}

export function isDeedKey(key: string): key is DeedKey {
  return byKey.has(key);
}
