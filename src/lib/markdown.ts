/**
 * A small, safe Markdown reader for plan notes. It produces plain data (never
 * HTML), so nothing typed into a note can run as code. Supported: paragraphs,
 * # headings, - and 1. lists, **bold**, _italic_ or *italic*, `code`,
 * [links](https://…) and bare https:// links.
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'b'; c: Inline[] }
  | { t: 'i'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; c: Inline[] };

export type Block =
  | { t: 'p'; c: Inline[] }
  | { t: 'h'; level: 1 | 2 | 3; c: Inline[] }
  | { t: 'ul'; items: Inline[][] }
  | { t: 'ol'; items: Inline[][] };

const SAFE_URL = /^https?:\/\/[^\s<>"]+$/i;

function trimUrl(url: string): string {
  // Trailing punctuation belongs to the sentence, not the link.
  return url.replace(/[.,;:!?)\]]+$/, '');
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push({ t: 'text', v: buf });
    buf = '';
  };
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^`([^`]+)`/))) {
      flush();
      out.push({ t: 'code', v: m[1] as string });
      i += m[0].length;
    } else if ((m = rest.match(/^\*\*(.+?)\*\*/))) {
      flush();
      out.push({ t: 'b', c: parseInline(m[1] as string) });
      i += m[0].length;
    } else if (
      (m = rest.match(/^(?:_([^_]+)_|\*([^*]+)\*)/)) &&
      (i === 0 || /\W/.test(text[i - 1] ?? ''))
    ) {
      flush();
      out.push({ t: 'i', c: parseInline((m[1] ?? m[2]) as string) });
      i += m[0].length;
    } else if ((m = rest.match(/^\[([^\]]+)\]\(([^)\s]+)\)/)) && SAFE_URL.test(m[2] as string)) {
      flush();
      out.push({ t: 'link', href: m[2] as string, c: parseInline(m[1] as string) });
      i += m[0].length;
    } else if (
      (m = rest.match(/^https?:\/\/[^\s<>"]+/i)) &&
      (i === 0 || /[\s(]/.test(text[i - 1] ?? ''))
    ) {
      const url = trimUrl(m[0]);
      flush();
      out.push({ t: 'link', href: url, c: [{ t: 'text', v: url }] });
      i += url.length;
    } else {
      buf += text[i];
      i += 1;
    }
  }
  flush();
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { t: 'ul' | 'ol'; items: string[] } | null = null;
  const endPara = () => {
    if (para.length) blocks.push({ t: 'p', c: parseInline(para.join(' ')) });
    para = [];
  };
  const endList = () => {
    if (list) blocks.push({ t: list.t, items: list.items.map(parseInline) });
    list = null;
  };
  for (const raw of src.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    let m: RegExpMatchArray | null;
    if (!line) {
      endPara();
      endList();
    } else if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      endPara();
      endList();
      blocks.push({
        t: 'h',
        level: (m[1] as string).length as 1 | 2 | 3,
        c: parseInline(m[2] as string),
      });
    } else if ((m = line.match(/^[-*•]\s+(.*)$/))) {
      endPara();
      if (list?.t !== 'ul') endList();
      list ??= { t: 'ul', items: [] };
      list.items.push(m[1] as string);
    } else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
      endPara();
      if (list?.t !== 'ol') endList();
      list ??= { t: 'ol', items: [] };
      list.items.push(m[1] as string);
    } else {
      endList();
      para.push(line);
    }
  }
  endPara();
  endList();
  return blocks;
}
