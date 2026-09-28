import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from './markdown';

describe('parseInline', () => {
  it('reads bold, italic, and code', () => {
    expect(parseInline('a **b** _c_ `d`')).toEqual([
      { t: 'text', v: 'a ' },
      { t: 'b', c: [{ t: 'text', v: 'b' }] },
      { t: 'text', v: ' ' },
      { t: 'i', c: [{ t: 'text', v: 'c' }] },
      { t: 'text', v: ' ' },
      { t: 'code', v: 'd' },
    ]);
  });

  it('leaves underscores inside words alone', () => {
    expect(parseInline('snake_case_name')).toEqual([{ t: 'text', v: 'snake_case_name' }]);
  });

  it('links only to http(s)', () => {
    expect(parseInline('[site](https://example.com/a)')).toEqual([
      { t: 'link', href: 'https://example.com/a', c: [{ t: 'text', v: 'site' }] },
    ]);
    expect(parseInline('[bad](javascript:alert(1))')).toEqual([
      { t: 'text', v: '[bad](javascript:alert(1))' },
    ]);
  });

  it('turns bare links into links, without trailing punctuation', () => {
    expect(parseInline('See https://example.com/x.')).toEqual([
      { t: 'text', v: 'See ' },
      { t: 'link', href: 'https://example.com/x', c: [{ t: 'text', v: 'https://example.com/x' }] },
      { t: 'text', v: '.' },
    ]);
  });

  it('keeps HTML as plain text', () => {
    expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([
      { t: 'text', v: '<img src=x onerror=alert(1)>' },
    ]);
  });
});

describe('parseMarkdown', () => {
  it('reads headings, paragraphs, and lists', () => {
    const blocks = parseMarkdown('# Trip\nLine one\nline two\n\n- a\n- b\n\n1. x\n2) y');
    expect(blocks.map((b) => b.t)).toEqual(['h', 'p', 'ul', 'ol']);
    expect(blocks[1]).toEqual({ t: 'p', c: [{ t: 'text', v: 'Line one line two' }] });
    expect(blocks[2]).toMatchObject({ items: [[{ v: 'a' }], [{ v: 'b' }]] });
    expect(blocks[3]).toMatchObject({ t: 'ol', items: [[{ v: 'x' }], [{ v: 'y' }]] });
  });

  it('handles empty notes and Windows line endings', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('a\r\n\r\nb')).toHaveLength(2);
  });
});
