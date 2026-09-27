import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';

const GAP = 8;

/**
 * Drag-to-reorder by a handle, plus arrow keys on the same handle. Rows slide
 * out of the way while dragging; onMove fires once, on drop.
 */
export function useSortable(count: number, onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<{ from: number; dy: number; h: number } | null>(null);
  const startY = useRef(0);

  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i));
  const target = drag ? clamp(drag.from + Math.round(drag.dy / drag.h)) : -1;

  const handleProps = (index: number) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      const row = e.currentTarget.closest('li');
      const h = (row?.getBoundingClientRect().height ?? 56) + GAP;
      e.currentTarget.setPointerCapture(e.pointerId);
      startY.current = e.clientY;
      setDrag({ from: index, dy: 0, h });
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (!drag || drag.from !== index) return;
      setDrag({ ...drag, dy: e.clientY - startY.current });
    },
    onPointerUp: () => {
      if (!drag) return;
      const to = clamp(drag.from + Math.round(drag.dy / drag.h));
      setDrag(null);
      if (to !== drag.from) onMove(drag.from, to);
    },
    onPointerCancel: () => setDrag(null),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'ArrowUp' && index > 0) {
        e.preventDefault();
        onMove(index, index - 1);
      } else if (e.key === 'ArrowDown' && index < count - 1) {
        e.preventDefault();
        onMove(index, index + 1);
      }
    },
    style: { touchAction: 'none' } as CSSProperties,
  });

  const styleFor = (index: number): CSSProperties | undefined => {
    if (!drag) return undefined;
    if (index === drag.from) {
      return { transform: `translateY(${drag.dy}px)`, zIndex: 2, position: 'relative' };
    }
    const shift =
      drag.from < target && index > drag.from && index <= target
        ? -drag.h
        : target < drag.from && index >= target && index < drag.from
          ? drag.h
          : 0;
    return shift
      ? { transform: `translateY(${shift}px)`, transition: 'transform 150ms ease' }
      : { transition: 'transform 150ms ease' };
  };

  return { handleProps, styleFor, draggingIndex: drag?.from ?? null };
}
