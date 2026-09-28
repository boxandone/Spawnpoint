import { describe, expect, it } from 'vitest';
import { getDeed } from '@/modules/rewards/deeds';
import { AREA_TEMPLATES } from '@/modules/locations/logic';
import { LIBRARY, LIBRARY_SECTIONS, staggeredStarts } from './library';
import { schedule as scheduleSchema } from './schedule';

describe('starter library', () => {
  it('covers every task in Appendix A', () => {
    expect(LIBRARY).toHaveLength(52);
  });

  it('has unique keys', () => {
    const keys = LIBRARY.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('only links deeds that exist in the catalog', () => {
    for (const t of LIBRARY) if (t.deedKey) expect(getDeed(t.deedKey), t.key).toBeDefined();
  });

  it('keeps the deed keys from Appendix A', () => {
    const linked = Object.fromEntries(
      LIBRARY.filter((t) => t.deedKey).map((t) => [t.key, t.deedKey]),
    );
    expect(linked).toMatchObject({
      'kitchen.dishwasher-filter': 'dishwasher_filter',
      'kitchen.range-hood': 'range_hood_filter',
      'kitchen.fridge-coils': 'fridge_coils',
      'kitchen.oven': 'oven_deep_clean',
      'bathrooms.caulk': 'recaulk',
      'laundry.washer-clean': 'washer_clean',
      'laundry.dryer-vent': 'dryer_vent',
      'pets.litter': 'litter_duty',
      'pool.chemistry': 'pool_chemistry',
      'pool.filter-deep': 'pool_filter_deep_clean',
      'yard.sprinklers': 'sprinkler_fix',
      'yard.hedges': 'hedge_trim',
      'yard.pressure-wash': 'pressure_wash',
      'yard.gutters': 'gutters',
      'systems.hvac-filter': 'hvac_filter',
      'systems.alarm-test': 'alarm_test',
      'systems.alarm-batteries': 'alarm_batteries',
      'systems.valves': 'valve_exercise',
      'systems.spigots': 'spigot_winterize',
      'systems.water-heater': 'water_heater_flush',
    });
    expect(LIBRARY.find((t) => t.key === 'systems.valves')?.unit).toBe('valves');
  });

  it('uses valid schedules and known sections and areas', () => {
    const areaKeys = new Set(Object.values(AREA_TEMPLATES).flatMap((t) => t.map((a) => a.key)));
    for (const t of LIBRARY) {
      expect(scheduleSchema.safeParse(t.schedule).success, t.key).toBe(true);
      expect(LIBRARY_SECTIONS).toContain(t.section);
      expect(areaKeys.has(t.area), t.key).toBe(true);
    }
  });
});

describe('staggeredStarts', () => {
  it('spreads long-interval tasks over the coming days and starts the rest today', () => {
    const starts = staggeredStarts(
      [
        { key: 'a', schedule: { type: 'every_n_days', n: 45 } },
        { key: 'b', schedule: { type: 'every_n_days', n: 45 } },
        { key: 'c', schedule: { type: 'every_n_days', n: 2 } },
        { key: 'd', schedule: { type: 'monthly_on', day: 1 } },
        { key: 'e', schedule: { type: 'every_n_days', n: 14 } },
      ],
      '2026-09-28',
    );
    expect(starts.get('a')).toBe('2026-10-01');
    expect(starts.get('b')).toBe('2026-10-06');
    expect(starts.get('c')).toBe('2026-09-28');
    expect(starts.get('d')).toBe('2026-09-28');
    expect(starts.get('e')! <= '2026-10-11').toBe(true);
  });
});
