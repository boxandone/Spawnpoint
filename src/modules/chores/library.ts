/**
 * Starter task library (docs/SPEC.md Appendix A). Generic templates the setup
 * wizard offers. Ranges and loose schedules become single editable values;
 * see docs/DECISIONS.md #4.
 *
 * Template keys are stored on tasks as `library_key`. Add new ones; don't rename.
 */
import type { AreaKey } from '@/modules/locations/logic';
import type { DeedKey } from '@/modules/rewards/deeds';
import type { IfMissed, Schedule } from './logic';
import { addDays, type IsoDate } from '../../lib/dates';

export type LibrarySection =
  | 'kitchen'
  | 'living'
  | 'bedrooms'
  | 'bathrooms'
  | 'laundry'
  | 'pets'
  | 'pool'
  | 'yard'
  | 'systems';

export interface LibraryTemplate {
  key: string;
  section: LibrarySection;
  title: string;
  schedule: Schedule;
  ifMissed: IfMissed;
  effort: 1 | 2 | 3;
  deedKey?: DeedKey;
  unit?: string;
  /** Which template area it lands in. */
  area: AreaKey;
  /** Picked by default in the wizard. */
  recommended?: boolean;
}

const daily: Schedule = { type: 'daily' };
const weekly: Schedule = { type: 'weekly_on', days: [6] };
const monthly: Schedule = { type: 'monthly_on', nth: 1, weekday: 6 };
const twiceAYear: Schedule = { type: 'yearly_in', months: [4, 10] };
const seasonal: Schedule = { type: 'yearly_in', months: [3, 6, 9, 12] };
const every = (n: number): Schedule => ({ type: 'every_n_days', n });
const yearlyIn = (...months: number[]): Schedule => ({ type: 'yearly_in', months });

export const LIBRARY: readonly LibraryTemplate[] = [
  // Kitchen
  {
    key: 'kitchen.wipe-counters',
    section: 'kitchen',
    area: 'kitchen',
    title: 'Wipe counters, stovetop, and sink',
    schedule: daily,
    ifMissed: 'let_go',
    effort: 1,
    recommended: true,
  },
  {
    key: 'kitchen.dishwasher',
    section: 'kitchen',
    area: 'kitchen',
    title: 'Run dishwasher at night, empty in the morning',
    schedule: daily,
    ifMissed: 'if_needed',
    effort: 1,
    recommended: true,
  },
  {
    key: 'kitchen.leftovers',
    section: 'kitchen',
    area: 'kitchen',
    title: 'Toss old fridge leftovers',
    schedule: weekly,
    ifMissed: 'let_go',
    effort: 1,
    recommended: true,
  },
  {
    key: 'kitchen.mop',
    section: 'kitchen',
    area: 'kitchen',
    title: 'Mop kitchen floor',
    schedule: weekly,
    ifMissed: 'let_go',
    effort: 2,
    recommended: true,
  },
  {
    key: 'kitchen.wipe-fronts',
    section: 'kitchen',
    area: 'kitchen',
    title: 'Wipe cabinet fronts, appliances, microwave',
    schedule: weekly,
    ifMissed: 'let_go',
    effort: 1,
  },
  {
    key: 'kitchen.dishwasher-filter',
    section: 'kitchen',
    area: 'kitchen',
    title: 'Clean dishwasher filter',
    schedule: monthly,
    ifMissed: 'let_go',
    effort: 1,
    deedKey: 'dishwasher_filter',
    recommended: true,
  },
  {
    key: 'kitchen.disposal',
    section: 'kitchen',
    area: 'kitchen',
    title: 'Freshen garbage disposal',
    schedule: monthly,
    ifMissed: 'let_go',
    effort: 1,
  },
  {
    key: 'kitchen.range-hood',
    section: 'kitchen',
    area: 'kitchen',
    title: 'Clean range hood filter',
    schedule: monthly,
    ifMissed: 'let_go',
    effort: 2,
    deedKey: 'range_hood_filter',
  },
  {
    key: 'kitchen.fridge-coils',
    section: 'kitchen',
    area: 'kitchen',
    title: 'Vacuum fridge coils',
    schedule: twiceAYear,
    ifMissed: 'let_go',
    effort: 2,
    deedKey: 'fridge_coils',
  },
  {
    key: 'kitchen.oven',
    section: 'kitchen',
    area: 'kitchen',
    title: 'Deep clean oven',
    schedule: twiceAYear,
    ifMissed: 'let_go',
    effort: 3,
    deedKey: 'oven_deep_clean',
  },

  // Living areas and office
  {
    key: 'living.pickup',
    section: 'living',
    area: 'living',
    title: '10-minute pickup',
    schedule: daily,
    ifMissed: 'let_go',
    effort: 1,
    recommended: true,
  },
  {
    key: 'living.dust',
    section: 'living',
    area: 'living',
    title: 'Dust top to bottom',
    schedule: weekly,
    ifMissed: 'let_go',
    effort: 2,
  },
  {
    key: 'living.vacuum',
    section: 'living',
    area: 'living',
    title: 'Vacuum floors and stairs',
    schedule: weekly,
    ifMissed: 'carry',
    effort: 2,
    recommended: true,
  },
  {
    key: 'living.couch',
    section: 'living',
    area: 'living',
    title: 'Vacuum couch and under cushions',
    schedule: monthly,
    ifMissed: 'let_go',
    effort: 1,
  },
  {
    key: 'living.desk',
    section: 'living',
    area: 'office',
    title: 'Clear desk at end of day',
    schedule: daily,
    ifMissed: 'let_go',
    effort: 1,
  },

  // Bedrooms
  {
    key: 'bedrooms.clothes',
    section: 'bedrooms',
    area: 'bedroom',
    title: 'Put clothes away',
    schedule: daily,
    ifMissed: 'let_go',
    effort: 1,
  },
  {
    key: 'bedrooms.make-bed',
    section: 'bedrooms',
    area: 'bedroom',
    title: 'Make the bed',
    schedule: daily,
    ifMissed: 'let_go',
    effort: 1,
  },
  {
    key: 'bedrooms.sheets',
    section: 'bedrooms',
    area: 'bedroom',
    title: 'Change sheets',
    schedule: every(10),
    ifMissed: 'carry',
    effort: 2,
    recommended: true,
  },
  {
    key: 'bedrooms.vacuum',
    section: 'bedrooms',
    area: 'bedroom',
    title: 'Vacuum bedrooms and hallway',
    schedule: weekly,
    ifMissed: 'let_go',
    effort: 2,
  },
  {
    key: 'bedrooms.under-beds',
    section: 'bedrooms',
    area: 'bedroom',
    title: 'Vacuum under beds',
    schedule: monthly,
    ifMissed: 'let_go',
    effort: 2,
  },

  // Bathrooms
  {
    key: 'bathrooms.clean',
    section: 'bathrooms',
    area: 'bathroom',
    title: 'Clean toilet, sink, mirror, shower',
    schedule: weekly,
    ifMissed: 'carry',
    effort: 2,
    recommended: true,
  },
  {
    key: 'bathrooms.caulk',
    section: 'bathrooms',
    area: 'bathroom',
    title: 'Check caulk around tubs and sinks',
    schedule: twiceAYear,
    ifMissed: 'let_go',
    effort: 1,
    deedKey: 'recaulk',
  },

  // Laundry
  {
    key: 'laundry.wash',
    section: 'laundry',
    area: 'laundry',
    title: 'Wash, dry, fold, put away',
    schedule: weekly,
    ifMissed: 'carry',
    effort: 2,
    recommended: true,
  },
  {
    key: 'laundry.washer-clean',
    section: 'laundry',
    area: 'laundry',
    title: 'Run washer cleaning cycle',
    schedule: monthly,
    ifMissed: 'let_go',
    effort: 1,
    deedKey: 'washer_clean',
  },
  {
    key: 'laundry.dryer-vent',
    section: 'laundry',
    area: 'laundry',
    title: 'Clean dryer vent duct',
    schedule: yearlyIn(3),
    ifMissed: 'carry',
    effort: 3,
    deedKey: 'dryer_vent',
  },

  // Pets
  {
    key: 'pets.litter',
    section: 'pets',
    area: 'home',
    title: 'Scoop litter boxes',
    schedule: daily,
    ifMissed: 'carry',
    effort: 1,
    deedKey: 'litter_duty',
  },
  {
    key: 'pets.water',
    section: 'pets',
    area: 'home',
    title: 'Fresh water',
    schedule: daily,
    ifMissed: 'carry',
    effort: 1,
  },
  {
    key: 'pets.bowls',
    section: 'pets',
    area: 'home',
    title: 'Wash bowls and fountain',
    schedule: weekly,
    ifMissed: 'carry',
    effort: 1,
  },
  {
    key: 'pets.litter-deep',
    section: 'pets',
    area: 'home',
    title: 'Dump and wash litter boxes',
    schedule: monthly,
    ifMissed: 'carry',
    effort: 2,
  },

  // Pool
  {
    key: 'pool.skim',
    section: 'pool',
    area: 'pool',
    title: 'Skim, empty skimmer and pump baskets',
    schedule: weekly,
    ifMissed: 'carry',
    effort: 1,
  },
  {
    key: 'pool.brush',
    section: 'pool',
    area: 'pool',
    title: 'Brush walls, steps, waterline',
    schedule: weekly,
    ifMissed: 'let_go',
    effort: 2,
  },
  {
    key: 'pool.chemistry',
    section: 'pool',
    area: 'pool',
    title: 'Test and adjust water chemistry',
    schedule: { type: 'weekly_on', days: [2, 5] },
    ifMissed: 'carry',
    effort: 1,
    deedKey: 'pool_chemistry',
  },
  {
    key: 'pool.level',
    section: 'pool',
    area: 'pool',
    title: 'Check water level',
    schedule: weekly,
    ifMissed: 'carry',
    effort: 1,
  },
  {
    key: 'pool.filter-pressure',
    section: 'pool',
    area: 'pool',
    title: 'Check filter pressure, clean or backwash as needed',
    schedule: monthly,
    ifMissed: 'carry',
    effort: 2,
  },
  {
    key: 'pool.tile',
    section: 'pool',
    area: 'pool',
    title: 'Scrub tile line',
    schedule: monthly,
    ifMissed: 'let_go',
    effort: 2,
  },
  {
    key: 'pool.filter-deep',
    section: 'pool',
    area: 'pool',
    title: 'Deep clean filter',
    schedule: twiceAYear,
    ifMissed: 'carry',
    effort: 3,
    deedKey: 'pool_filter_deep_clean',
  },

  // Yard, driveway, side yard
  {
    key: 'yard.sweep-driveway',
    section: 'yard',
    area: 'driveway',
    title: 'Sweep or blow driveway and walks',
    schedule: weekly,
    ifMissed: 'let_go',
    effort: 1,
  },
  {
    key: 'yard.patio',
    section: 'yard',
    area: 'yard',
    title: 'Sweep or hose patio',
    schedule: weekly,
    ifMissed: 'let_go',
    effort: 1,
  },
  {
    key: 'yard.water-plants',
    section: 'yard',
    area: 'yard',
    title: 'Water potted plants',
    schedule: every(2),
    ifMissed: 'carry',
    effort: 1,
  },
  {
    key: 'yard.weeds',
    section: 'yard',
    area: 'yard',
    title: 'Pull weeds, check beds',
    schedule: weekly,
    ifMissed: 'let_go',
    effort: 2,
  },
  {
    key: 'yard.sprinklers',
    section: 'yard',
    area: 'yard',
    title: 'Test sprinklers, fix broken heads',
    schedule: monthly,
    ifMissed: 'let_go',
    effort: 2,
    deedKey: 'sprinkler_fix',
  },
  {
    key: 'yard.sprinkler-timer',
    section: 'yard',
    area: 'yard',
    title: 'Adjust sprinkler timer for the season',
    schedule: seasonal,
    ifMissed: 'let_go',
    effort: 1,
  },
  {
    key: 'yard.hedges',
    section: 'yard',
    area: 'yard',
    title: 'Trim shrubs and hedges',
    schedule: seasonal,
    ifMissed: 'let_go',
    effort: 3,
    deedKey: 'hedge_trim',
  },
  {
    key: 'yard.pressure-wash',
    section: 'yard',
    area: 'driveway',
    title: 'Pressure wash hard surfaces',
    schedule: twiceAYear,
    ifMissed: 'let_go',
    effort: 3,
    deedKey: 'pressure_wash',
  },
  {
    key: 'yard.gutters',
    section: 'yard',
    area: 'yard',
    title: 'Clear gutters and downspouts',
    schedule: yearlyIn(10),
    ifMissed: 'carry',
    effort: 3,
    deedKey: 'gutters',
  },
  {
    key: 'yard.trash',
    section: 'yard',
    area: 'driveway',
    title: 'Trash and recycling to the curb',
    schedule: { type: 'weekly_on', days: [0] },
    ifMissed: 'carry',
    effort: 1,
    recommended: true,
  },

  // Systems and safety
  {
    key: 'systems.hvac-filter',
    section: 'systems',
    area: 'home',
    title: 'Check HVAC filter, replace if dirty',
    schedule: every(45),
    ifMissed: 'carry',
    effort: 1,
    deedKey: 'hvac_filter',
    recommended: true,
  },
  {
    key: 'systems.alarm-test',
    section: 'systems',
    area: 'home',
    title: 'Test smoke and CO alarms',
    schedule: { type: 'monthly_on', day: 1 },
    ifMissed: 'carry',
    effort: 1,
    deedKey: 'alarm_test',
    recommended: true,
  },
  {
    key: 'systems.alarm-batteries',
    section: 'systems',
    area: 'home',
    title: 'Replace smoke alarm batteries',
    schedule: yearlyIn(11),
    ifMissed: 'carry',
    effort: 1,
    deedKey: 'alarm_batteries',
  },
  {
    key: 'systems.valves',
    section: 'systems',
    area: 'home',
    title: 'Exercise water shutoff valves',
    schedule: twiceAYear,
    ifMissed: 'carry',
    effort: 1,
    deedKey: 'valve_exercise',
    unit: 'valves',
  },
  {
    key: 'systems.spigots',
    section: 'systems',
    area: 'yard',
    title: 'Prep outdoor spigots before freezing nights',
    schedule: yearlyIn(10),
    ifMissed: 'carry',
    effort: 1,
    deedKey: 'spigot_winterize',
  },
  {
    key: 'systems.water-heater',
    section: 'systems',
    area: 'home',
    title: 'Flush water heater',
    schedule: yearlyIn(4),
    ifMissed: 'carry',
    effort: 3,
    deedKey: 'water_heater_flush',
  },
];

export const LIBRARY_SECTIONS: LibrarySection[] = [
  'kitchen',
  'living',
  'bedrooms',
  'bathrooms',
  'laundry',
  'pets',
  'pool',
  'yard',
  'systems',
];

export function getTemplate(key: string): LibraryTemplate | undefined {
  return LIBRARY.find((t) => t.key === key);
}

/**
 * First due dates for new tasks from the library. Tasks that repeat every two
 * weeks or more are spread over the coming days instead of all landing on
 * setup day; everything else starts today (fixed schedules have their own days).
 */
export function staggeredStarts(
  templates: ReadonlyArray<Pick<LibraryTemplate, 'key' | 'schedule'>>,
  today: IsoDate,
): Map<string, IsoDate> {
  const out = new Map<string, IsoDate>();
  let i = 0;
  for (const tpl of templates) {
    const s = tpl.schedule;
    if (s.type === 'every_n_days' && s.n >= 14) {
      const offset = Math.min(s.n - 1, 3 + ((i * 5) % Math.min(s.n, 30)));
      out.set(tpl.key, addDays(today, offset));
      i += 1;
    } else {
      out.set(tpl.key, today);
    }
  }
  return out;
}
