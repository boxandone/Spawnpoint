import { describe, expect, it } from 'vitest';
import {
  AREA_TEMPLATES,
  areaOf,
  buildTree,
  listAreas,
  locationLabel,
  makeAncestry,
  resolveArea,
  type LocationLike,
} from './logic';

const locs: LocationLike[] = [
  { id: 'down', parent_id: null, kind: 'zone', name: 'Downstairs', sort: 1 },
  { id: 'kitchen', parent_id: 'down', kind: 'area', name: 'Kitchen', sort: 1 },
  { id: 'sink', parent_id: 'kitchen', kind: 'spot', name: 'Under-sink cabinet', sort: 1 },
  { id: 'living', parent_id: 'down', kind: 'area', name: 'Living room', sort: 2 },
  { id: 'home', parent_id: null, kind: 'area', name: 'Whole home', sort: 9 },
  {
    id: 'old',
    parent_id: null,
    kind: 'area',
    name: 'Old shed',
    sort: 5,
    archived_at: '2026-01-01T00:00:00Z',
  },
];

describe('location tree', () => {
  it('builds ancestry chains', () => {
    const anc = makeAncestry(locs);
    expect(anc('sink')).toEqual(['sink', 'kitchen', 'down']);
    expect(anc('home')).toEqual(['home']);
    expect(anc('missing')).toEqual(['missing']);
  });

  it('survives a cycle', () => {
    const anc = makeAncestry([
      { id: 'a', parent_id: 'b', kind: 'area', name: 'A', sort: 0 },
      { id: 'b', parent_id: 'a', kind: 'zone', name: 'B', sort: 0 },
    ]);
    expect(anc('a')).toEqual(['a', 'b']);
  });

  it('lists areas in order with their zones, skipping archived', () => {
    expect(listAreas(locs).map((x) => [x.area.name, x.zone?.name ?? null])).toEqual([
      ['Kitchen', 'Downstairs'],
      ['Living room', 'Downstairs'],
      ['Whole home', null],
    ]);
    expect(buildTree(locs).map((n) => n.location.id)).toEqual(['down', 'home']);
  });

  it('labels spots with their area and finds the area of a spot', () => {
    expect(locationLabel('sink', locs)).toBe('Kitchen › Under-sink cabinet');
    expect(locationLabel('kitchen', locs)).toBe('Kitchen');
    expect(areaOf('sink', locs)).toBe('kitchen');
    expect(areaOf('down', locs)).toBeNull();
  });
});

describe('area templates', () => {
  it('every template has a Whole home area', () => {
    for (const t of Object.values(AREA_TEMPLATES))
      expect(t.some((a) => a.key === 'home')).toBe(true);
  });

  it('resolves library areas to picked ones, with sensible fallbacks', () => {
    const apartment = new Set(
      AREA_TEMPLATES.apartment.filter((a) => !a.optional).map((a) => a.key),
    );
    expect(resolveArea('kitchen', apartment)).toBe('kitchen');
    expect(resolveArea('office', apartment)).toBe('living');
    expect(resolveArea('laundry', apartment)).toBe('home');
    expect(resolveArea('pool', apartment)).toBeNull();
    expect(resolveArea('driveway', apartment)).toBeNull();
  });
});
