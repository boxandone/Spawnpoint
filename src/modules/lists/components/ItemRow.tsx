import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useCopy } from '@/theme';
import type { useSortable } from './useSortable';

const SWIPE = 80;

export interface ItemRowProps {
  name: string;
  checked: boolean;
  /** Label for the round check button. */
  checkLabel: string;
  onToggle: (el: HTMLElement) => void;
  onOpen: () => void;
  onDelete: () => void;
  meta?: ReactNode;
  trailing?: ReactNode;
  /** Drag handle props from useSortable; omitted for rows that don't reorder. */
  handle?: ReturnType<ReturnType<typeof useSortable>['handleProps']>;
  style?: CSSProperties;
  dragging?: boolean;
}

/**
 * One list item. Tap the circle to check it; tap the text to edit. Swipe right
 * to check, left to remove (with undo). The dots reorder.
 */
export function ItemRow({
  name,
  checked,
  checkLabel,
  onToggle,
  onOpen,
  onDelete,
  meta,
  trailing,
  handle,
  style,
  dragging,
}: ItemRowProps) {
  const t = useCopy();
  const checkRef = useRef<HTMLButtonElement>(null);
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null);
  const swiped = useRef(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, axis: null };
    swiped.current = false;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!s.axis && Math.hypot(mx, my) > 8) {
      s.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if (s.axis === 'x') e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (s.axis === 'x') setDx(Math.max(-120, Math.min(120, mx)));
  };
  const onPointerEnd = () => {
    const s = start.current;
    start.current = null;
    if (s?.axis === 'x') {
      swiped.current = true;
      if (dx >= SWIPE && checkRef.current) onToggle(checkRef.current);
      else if (dx <= -SWIPE) onDelete();
    }
    setDx(0);
  };

  return (
    <li style={style} className="relative">
      {dx !== 0 && (
        <div
          aria-hidden
          className={cn(
            'absolute inset-0 flex items-center rounded-theme px-5',
            dx > 0
              ? 'justify-start bg-success text-on-success'
              : 'justify-end bg-danger text-on-danger',
          )}
        >
          <Icon name={dx > 0 ? 'check' : 'trash'} size={22} strokeWidth={2.5} />
        </div>
      )}
      <div
        className={cn(
          'sp-panel relative flex min-h-[56px] items-center gap-2 py-1.5 pl-2 pr-1',
          checked && 'opacity-70',
          dragging && 'shadow-lg',
        )}
        style={{
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: dx ? undefined : 'transform 150ms ease',
          touchAction: 'pan-y',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <button
          ref={checkRef}
          type="button"
          aria-label={checkLabel}
          aria-pressed={checked}
          onClick={() => checkRef.current && onToggle(checkRef.current)}
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors',
            checked
              ? 'bg-success text-on-success'
              : 'text-primary shadow-[inset_0_0_0_2.5px_var(--primary)] hover:bg-primary/10 active:bg-primary/20',
          )}
        >
          <Icon name="check" size={20} strokeWidth={3} className={cn(!checked && 'opacity-0')} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (swiped.current) {
              swiped.current = false;
              return;
            }
            onOpen();
          }}
          aria-label={t('lists.open', { name })}
          className="min-w-0 flex-1 select-none py-1 text-left"
        >
          <span
            className={cn(
              'block truncate font-bold leading-snug',
              checked && 'line-through decoration-2',
            )}
          >
            {name}
          </span>
          {meta && (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
              {meta}
            </span>
          )}
        </button>
        {trailing}
        {handle && (
          <button
            type="button"
            aria-label={t('lists.move', { name })}
            className="grid h-11 w-9 shrink-0 cursor-grab place-items-center rounded-theme-sm text-ink-muted active:cursor-grabbing"
            {...handle}
          >
            <Icon name="grip" size={20} />
          </button>
        )}
      </div>
    </li>
  );
}
