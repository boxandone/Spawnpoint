import { describe, expect, it } from 'vitest';
import { DEEDS, getDeed } from './deeds';

describe('deed catalog', () => {
  it('has unique, well-formed keys', () => {
    const keys = DEEDS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^[a-z0-9_]{1,40}$/);
  });

  it('keeps every key from the starting catalog (keys are permanent)', () => {
    const permanent = [
      'toilet_flapper',
      'drain_unclog',
      'faucet_fix',
      'valve_exercise',
      'spigot_winterize',
      'water_heater_flush',
      'recaulk',
      'hvac_filter',
      'alarm_test',
      'alarm_batteries',
      'dryer_vent',
      'fire_extinguisher',
      'fridge_coils',
      'dishwasher_filter',
      'range_hood_filter',
      'washer_clean',
      'oven_deep_clean',
      'drywall_patch',
      'light_fixture',
      'door_fix',
      'furniture_assembly',
      'appliance_install',
      'gutters',
      'pressure_wash',
      'hedge_trim',
      'sprinkler_fix',
      'planted_something',
      'pool_chemistry',
      'pool_filter_deep_clean',
      'litter_duty',
      'pet_bath',
      'closet_reset',
      'garage_reset',
    ];
    for (const k of permanent) expect(getDeed(k), k).toBeDefined();
  });

  it('has ascending tiers and XP in range', () => {
    for (const d of DEEDS) {
      expect(d.tiers[0]).toBeLessThan(d.tiers[1]);
      expect(d.tiers[1]).toBeLessThan(d.tiers[2]);
      expect(d.xp === 0 || (d.xp >= 10 && d.xp <= 60)).toBe(true);
    }
  });
});
