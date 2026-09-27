import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div' | 'article' | 'li';
  tone?: 'surface' | 'surface-2';
  padded?: boolean;
  children?: ReactNode;
}

/** A themed card. Shape (radius, clipped corner, stroke) comes from tokens. */
export function Panel({
  as: Tag = 'div',
  tone = 'surface',
  padded = true,
  className,
  children,
  ...rest
}: PanelProps) {
  return (
    <Tag
      className={cn('sp-panel', tone === 'surface-2' && 'sp-panel-2', padded && 'p-4', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function SectionTitle({
  children,
  action,
  id,
}: {
  children: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-2 mt-6 flex items-end justify-between gap-2 px-1">
      <h2 id={id} className="text-sm text-ink-muted">
        {children}
      </h2>
      {action}
    </div>
  );
}
