import { describe, expect, it } from 'vitest';
import {
  documentPaths,
  extensionFor,
  fitWithin,
  formatBytes,
  labelUrl,
  LABEL_STOCKS,
  normalizeCode,
  paginateLabels,
  parseScan,
  parseTags,
  prefillFromToBuy,
  searchItems,
  warrantyWatch,
} from './logic';

describe('parseTags', () => {
  it('trims, dedupes without caring about case, and keeps order', () => {
    expect(parseTags('Kitchen, small  appliance , kitchen,, #gift')).toEqual([
      'Kitchen',
      'small appliance',
      'gift',
    ]);
  });
  it('caps at 20 tags of 40 characters', () => {
    const many = Array.from({ length: 30 }, (_, i) => `t${i}`).join(',');
    expect(parseTags(many)).toHaveLength(20);
    expect(parseTags('x'.repeat(60))[0]).toHaveLength(40);
  });
});

describe('searchItems', () => {
  const items = [
    {
      id: '1',
      name: 'Cordless drill',
      brand: 'Acme',
      model: 'D-100',
      tags: ['tools'],
      spot: 'Top shelf',
      location_id: 'g',
    },
    {
      id: '2',
      name: 'Drill bits',
      brand: null,
      model: null,
      tags: [],
      spot: null,
      location_id: 'g',
    },
    {
      id: '3',
      name: 'Router',
      brand: 'Netco',
      model: 'AX3000',
      tags: ['network'],
      spot: null,
      location_id: 'o',
    },
    {
      id: '4',
      name: 'Stand mixer',
      brand: null,
      model: null,
      tags: ['baking'],
      spot: null,
      location_id: null,
      barcode: '0123456789012',
    },
  ];
  const loc = (id: string | null) => (id === 'g' ? 'Garage' : id === 'o' ? 'Office' : null);

  it('matches every word across fields', () => {
    expect(searchItems(items, 'garage acme', loc).map((i) => i.id)).toEqual(['1']);
    expect(searchItems(items, 'ax3000', loc).map((i) => i.id)).toEqual(['3']);
    expect(searchItems(items, 'office', loc).map((i) => i.id)).toEqual(['3']);
    expect(searchItems(items, 'baking', loc).map((i) => i.id)).toEqual(['4']);
    expect(searchItems(items, '0123456789012', loc).map((i) => i.id)).toEqual(['4']);
  });

  it('ranks names that start with the word first', () => {
    expect(searchItems(items, 'drill', loc).map((i) => i.id)).toEqual(['2', '1']);
  });

  it('an empty query returns everything', () => {
    expect(searchItems(items, '  ', loc)).toHaveLength(4);
  });

  it('finds nothing when a word misses', () => {
    expect(searchItems(items, 'drill office', loc)).toEqual([]);
  });
});

describe('warrantyWatch', () => {
  const today = '2026-09-27';
  const base = { status: 'active', archived_at: null };
  const items = [
    { id: 'a', warranty_until: '2026-10-01', ...base },
    { id: 'b', warranty_until: '2026-09-27', ...base },
    { id: 'c', warranty_until: '2026-11-26', ...base },
    { id: 'd', warranty_until: '2026-11-27', ...base },
    { id: 'e', warranty_until: '2026-09-26', ...base },
    { id: 'f', warranty_until: null, ...base },
    { id: 'g', warranty_until: '2026-10-02', status: 'sold', archived_at: null },
    {
      id: 'h',
      warranty_until: '2026-10-02',
      status: 'active',
      archived_at: '2026-01-01T00:00:00Z',
    },
    { id: 'i', warranty_until: '2026-10-03', status: 'lent', archived_at: null },
  ];

  it('lists the next 60 days, soonest first, with days left', () => {
    expect(warrantyWatch(items, today).map((w) => [w.item.id, w.daysLeft])).toEqual([
      ['b', 0],
      ['a', 4],
      ['i', 6],
      ['c', 60],
    ]);
  });
});

describe('scan codes', () => {
  it('normalizes easily confused characters', () => {
    expect(normalizeCode('ab1c-2de3')).toBe('AB1C2DE3');
    expect(normalizeCode('abicldo3')).toBe('AB1C1D03');
    expect(normalizeCode('ABCDEFGU')).toBeNull();
    expect(normalizeCode('SHORT')).toBeNull();
  });

  it('reads our label URLs from any host', () => {
    expect(parseScan('https://example.netlify.app/s/7K3M9Q2A')).toEqual({
      kind: 'code',
      code: '7K3M9Q2A',
    });
    expect(parseScan('http://localhost:5173/s/7k3m9q2a/')).toEqual({
      kind: 'code',
      code: '7K3M9Q2A',
    });
  });

  it('reads a bare code with letters', () => {
    expect(parseScan('7k3m9q2a')).toEqual({ kind: 'code', code: '7K3M9Q2A' });
  });

  it('treats product numbers as barcodes', () => {
    expect(parseScan('0012345678905')).toEqual({ kind: 'barcode', value: '0012345678905' });
    expect(parseScan('12345678')).toEqual({ kind: 'barcode', value: '12345678' });
    expect(parseScan('ABC-12345-XYZ')).toEqual({ kind: 'barcode', value: 'ABC-12345-XYZ' });
  });

  it('never follows other links', () => {
    expect(parseScan('https://example.com/promo')).toEqual({
      kind: 'other',
      text: 'https://example.com/promo',
    });
    expect(parseScan('https://example.com/s/7K3M9Q2A/extra').kind).toBe('other');
  });

  it('builds label URLs', () => {
    expect(labelUrl('https://example.app/', 'AB12CD34')).toBe('https://example.app/s/AB12CD34');
  });
});

describe('paginateLabels', () => {
  it('fills sheets and pads the last one', () => {
    const sheets = paginateLabels([1, 2, 3, 4, 5], 4);
    expect(sheets).toEqual([
      [1, 2, 3, 4],
      [5, null, null, null],
    ]);
  });

  it('skips used spots on the first sheet', () => {
    expect(paginateLabels(['a', 'b'], 4, 3)).toEqual([
      [null, null, null, 'a'],
      ['b', null, null, null],
    ]);
  });

  it('never skips a whole sheet', () => {
    expect(paginateLabels(['a'], 4, 10)[0]).toEqual([null, null, null, 'a']);
  });

  it('the stock sizes fit a letter page', () => {
    for (const s of LABEL_STOCKS) expect(s.columns * s.rows).toBeGreaterThan(0);
  });
});

describe('files', () => {
  it('builds paths the database accepts', () => {
    expect(documentPaths('h', { itemId: 'i' }, 'd', 'image/jpeg', true)).toEqual({
      path: 'h/i/d.jpg',
      thumb: 'h/i/d_thumb.jpg',
    });
    expect(documentPaths('h', {}, 'd', 'application/pdf', false)).toEqual({
      path: 'h/household/d.pdf',
      thumb: null,
    });
    expect(documentPaths('h', {}, 'd', 'text/html', false)).toBeNull();
    expect(documentPaths('h', { planId: 'p' }, 'd', 'application/pdf', false)?.path).toBe(
      'h/plan-p/d.pdf',
    );
    expect(extensionFor('image/heic')).toBe('heic');
  });

  it('fits images without enlarging them', () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(300, 600, 2000)).toEqual({ width: 300, height: 600 });
  });

  it('formats sizes', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
    expect(formatBytes(250 * 1024 * 1024)).toBe('250 MB');
  });
});

describe('prefillFromToBuy', () => {
  it('carries over name, price, day, area, notes, and the first link', () => {
    expect(
      prefillFromToBuy({
        name: 'Porch light',
        target_price: 45,
        bought_on: '2026-09-27',
        location_id: 'loc',
        notes: 'warm white',
        links: ['https://example.com/a', 'https://example.com/b'],
      }),
    ).toEqual({
      name: 'Porch light',
      price: 45,
      purchased_on: '2026-09-27',
      location_id: 'loc',
      notes: 'warm white',
      url: 'https://example.com/a',
    });
  });
});
