import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  byPosition,
  groupByCategory,
  guessCategory,
  isValidLink,
  linkLabel,
  matchSuggestions,
  nameKey,
  nextBuyStatus,
  parseLinks,
  parsePrice,
  parseQuickAdd,
  positionForMove,
  sortToBuy,
  topPosition,
  bottomPosition,
} from './logic';

describe('guessCategory', () => {
  it.each([
    ['Milk', 'dairy'],
    ['eggs', 'dairy'],
    ['Bananas', 'produce'],
    ['strawberries', 'produce'],
    ['Sourdough bread', 'bakery'],
    ['chicken thighs', 'meat'],
    ['ground beef', 'meat'],
    ['Rice', 'pantry'],
    ['peanut butter', 'pantry'],
    ['chicken broth', 'pantry'],
    ['orange juice', 'drinks'],
    ['coffee beans', 'pantry'],
    ['ground coffee', 'drinks'],
    ['ice cream', 'frozen'],
    ['frozen berries', 'frozen'],
    ['dog food', 'pets'],
    ['cat litter', 'pets'],
    ['Paper towels', 'household'],
    ['dish soap', 'household'],
    ['iced tea', 'drinks'],
    ['something odd', 'other'],
    ['', 'other'],
  ])('%s → %s', (name, category) => {
    expect(guessCategory(name)).toBe(category);
  });

  it("doesn't match inside other words", () => {
    expect(guessCategory('rice')).toBe('pantry');
    expect(guessCategory('scallions')).toBe('other');
  });

  it('always returns a known category', () => {
    for (const n of ['x', '123', 'milk!!', 'Tofu']) {
      expect(CATEGORIES).toContain(guessCategory(n));
    }
  });
});

describe('parseQuickAdd', () => {
  it.each([
    ['milk', { name: 'milk', quantity: null }],
    ['2 milk', { name: 'milk', quantity: '2' }],
    ['3 lb chicken', { name: 'chicken', quantity: '3 lb' }],
    ['1.5 kg flour', { name: 'flour', quantity: '1.5 kg' }],
    ['2 x yogurt', { name: 'yogurt', quantity: '2' }],
    ['eggs x12', { name: 'eggs', quantity: '12' }],
    ['eggs (12)', { name: 'eggs', quantity: '12' }],
    ['2 big onions', { name: 'big onions', quantity: '2' }],
    ['  spaced   out  ', { name: 'spaced out', quantity: null }],
    ['7up', { name: '7up', quantity: null }],
  ])('%s', (text, expected) => {
    expect(parseQuickAdd(text)).toEqual(expected);
  });
});

describe('ordering', () => {
  const items = [
    { id: 'a', position: 1 },
    { id: 'b', position: 2 },
    { id: 'c', position: 3 },
    { id: 'd', position: 4 },
  ];

  it('quick-add goes on top, and bottom goes below', () => {
    expect(topPosition(items)).toBe(0);
    expect(bottomPosition(items)).toBe(5);
    expect(topPosition([])).toBe(0);
  });

  it('moving down lands between the new neighbors', () => {
    expect(positionForMove(items, 0, 2)).toBe(3.5);
  });

  it('moving up lands between the new neighbors', () => {
    expect(positionForMove(items, 3, 1)).toBe(1.5);
  });

  it('moving to the ends goes past the first or last', () => {
    expect(positionForMove(items, 2, 0)).toBe(0);
    expect(positionForMove(items, 0, 3)).toBe(5);
  });

  it('the moved item sorts where it was dropped', () => {
    const p = positionForMove(items, 0, 2);
    const next = byPosition(items.map((i) => (i.id === 'a' ? { ...i, position: p } : i)));
    expect(next.map((i) => i.id)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('a single item stays put', () => {
    expect(positionForMove([{ id: 'x', position: 7 }], 0, 0)).toBe(7);
  });
});

describe('groupByCategory', () => {
  it('groups in aisle order and leaves out empty groups', () => {
    const groups = groupByCategory([
      { id: '1', category: 'dairy', position: 2 },
      { id: '2', category: 'produce', position: 3 },
      { id: '3', category: 'dairy', position: 1 },
      { id: '4', category: null, position: 0 },
      { id: '5', category: 'nonsense', position: 5 },
    ]);
    expect(groups.map((g) => g.category)).toEqual(['produce', 'dairy', 'other']);
    expect(groups[1]?.items.map((i) => i.id)).toEqual(['3', '1']);
    expect(groups[2]?.items.map((i) => i.id)).toEqual(['4', '5']);
  });
});

describe('matchSuggestions', () => {
  const pool = [
    { name: 'Milk', quantity: null, category: 'dairy' },
    { name: 'Almond milk', quantity: null, category: 'dairy' },
    { name: 'Mint', quantity: null, category: 'produce' },
    { name: 'milk', quantity: '2', category: 'dairy' },
    { name: 'Bread', quantity: null, category: 'bakery' },
  ];

  it('prefix matches come before word matches, without duplicates', () => {
    expect(matchSuggestions('mi', pool, []).map((s) => s.name)).toEqual([
      'Milk',
      'Mint',
      'Almond milk',
    ]);
  });

  it('skips what is already on the list', () => {
    expect(matchSuggestions('mi', pool, [' MILK ']).map((s) => s.name)).toEqual([
      'Mint',
      'Almond milk',
    ]);
  });

  it('skips an exact match of what you typed and empty queries', () => {
    expect(matchSuggestions('bread', pool, [])).toEqual([]);
    expect(matchSuggestions('  ', pool, [])).toEqual([]);
  });

  it('respects the limit', () => {
    expect(matchSuggestions('m', pool, [], 1)).toHaveLength(1);
  });
});

describe('to buy', () => {
  it('status moves forward and stops at bought', () => {
    expect(nextBuyStatus('idea')).toBe('to_buy');
    expect(nextBuyStatus('to_buy')).toBe('bought');
    expect(nextBuyStatus('bought')).toBe('bought');
    expect(nextBuyStatus(null)).toBe('bought');
  });

  it('sorts to buy, then ideas, then bought; high priority first', () => {
    const sorted = sortToBuy([
      { id: '1', position: 0, status: 'bought', priority: 'high' },
      { id: '2', position: 1, status: 'idea', priority: 'normal' },
      { id: '3', position: 2, status: 'to_buy', priority: 'low' },
      { id: '4', position: 3, status: 'to_buy', priority: 'high' },
    ]);
    expect(sorted.map((i) => i.id)).toEqual(['4', '3', '2', '1']);
  });
});

describe('links and prices', () => {
  it('accepts only http(s) links', () => {
    expect(isValidLink('https://example.com/a')).toBe(true);
    expect(isValidLink('http://example.com')).toBe(true);
    expect(isValidLink('javascript:alert(1)')).toBe(false);
    expect(isValidLink('example.com')).toBe(false);
    expect(isValidLink(`https://example.com/${'a'.repeat(500)}`)).toBe(false);
  });

  it('parses pasted links, at most 5', () => {
    const text = Array.from({ length: 7 }, (_, i) => `https://example.com/${i}`).join('\n');
    expect(parseLinks(`${text} nope`).links).toHaveLength(5);
    expect(parseLinks('nope https://example.com').invalid).toEqual(['nope']);
  });

  it('shows a short host name', () => {
    expect(linkLabel('https://www.example.com/item/1')).toBe('example.com');
    expect(linkLabel('not a url')).toBe('not a url');
  });

  it('parses prices the way people type them', () => {
    expect(parsePrice('$1,299.99')).toBe(1299.99);
    expect(parsePrice('20')).toBe(20);
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
  });

  it('name keys ignore case and spacing', () => {
    expect(nameKey('  Almond   Milk ')).toBe('almond milk');
  });
});
