import { Fragment, type ReactNode } from 'react';
import { parseMarkdown, type Inline } from '@/lib/markdown';

function inline(nodes: Inline[]): ReactNode {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text':
        return <Fragment key={i}>{n.v}</Fragment>;
      case 'b':
        return <strong key={i}>{inline(n.c)}</strong>;
      case 'i':
        return <em key={i}>{inline(n.c)}</em>;
      case 'code':
        return (
          <code key={i} className="rounded bg-surface-2 px-1 font-mono text-[0.9em]">
            {n.v}
          </code>
        );
      case 'link':
        return (
          <a
            key={i}
            href={n.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-bold underline underline-offset-2"
          >
            {inline(n.c)}
          </a>
        );
    }
  });
}

/** Notes written in simple Markdown, rendered as React (never as raw HTML). */
export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 text-[15px] leading-relaxed ${className ?? ''}`}>
      {parseMarkdown(text).map((b, i) => {
        if (b.t === 'h') {
          const size = b.level === 1 ? 'text-xl' : b.level === 2 ? 'text-lg' : 'text-base';
          return (
            <p
              key={i}
              role="heading"
              aria-level={b.level + 2}
              className={`font-display font-bold ${size}`}
            >
              {inline(b.c)}
            </p>
          );
        }
        if (b.t === 'ul' || b.t === 'ol') {
          const List = b.t;
          return (
            <List key={i} className={`${b.t === 'ul' ? 'list-disc' : 'list-decimal'} pl-6`}>
              {b.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </List>
          );
        }
        return <p key={i}>{inline(b.c)}</p>;
      })}
    </div>
  );
}
