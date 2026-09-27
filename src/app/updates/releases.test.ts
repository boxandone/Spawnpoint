import { describe, expect, it } from 'vitest';
import { APP_VERSION, compareVersions, LATEST, RELEASES } from './releases';

describe('release notes', () => {
  it('has a note for the current app version', () => {
    expect(LATEST.version).toBe(APP_VERSION);
  });

  it('lists releases newest first with unique, well-formed versions', () => {
    const versions = RELEASES.map((r) => r.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (const v of versions) expect(v).toMatch(/^\d+\.\d+\.\d+$/);
    for (let i = 1; i < RELEASES.length; i++) {
      expect(compareVersions(RELEASES[i - 1]!.version, RELEASES[i]!.version)).toBeGreaterThan(0);
      expect(RELEASES[i - 1]!.date >= RELEASES[i]!.date).toBe(true);
    }
  });

  it('every release has a title and at least one change', () => {
    for (const r of RELEASES) {
      expect(r.title.trim()).not.toBe('');
      expect(r.changes.length).toBeGreaterThan(0);
    }
  });

  it('compares versions numerically', () => {
    expect(compareVersions('1.10.0', '1.9.2')).toBeGreaterThan(0);
    expect(compareVersions('0.2.0', '0.2.0')).toBe(0);
    expect(compareVersions('0.1.9', '0.2.0')).toBeLessThan(0);
  });
});
