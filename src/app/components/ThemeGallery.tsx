import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { TodayView, type TodayViewProps } from '@/modules/chores/components/TodayView';
import { THEME_PACKS, ThemeScope, useCopy, useThemeScope } from '@/theme';

const PREVIEW_WIDTH = 390;

/** A real Today screen, shrunk to fit a tile. */
function ScaledPreview({
  themeId,
  mode,
  props,
}: {
  themeId: string;
  mode: 'light' | 'dark';
  props: TodayViewProps;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.42);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(
      ([entry]) => entry && setScale(entry.contentRect.width / PREVIEW_WIDTH),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={box}
      className="relative aspect-[3/4] w-full overflow-hidden"
      aria-hidden
      {...{ inert: '' }}
    >
      <ThemeScope
        themeId={themeId}
        mode={mode}
        className="pointer-events-none absolute left-0 top-0 origin-top-left bg-bg px-4 [background-image:var(--texture)]"
        style={{ width: PREVIEW_WIDTH, transform: `scale(${scale})`, height: `${100 / scale}%` }}
      >
        <TodayView {...props} />
      </ThemeScope>
    </div>
  );
}

interface GalleryProps {
  value: string | null;
  onChange: (id: string) => void;
  preview: TodayViewProps;
  /** Adds a "follow the household" option (personal settings). */
  followLabel?: string;
  followValue?: string;
}

/** Pick a theme by looking at your own Today screen in each one. */
export function ThemeGallery({ value, onChange, preview, followLabel, followValue }: GalleryProps) {
  const t = useCopy();
  const { mode } = useThemeScope();
  return (
    <div role="radiogroup" aria-label={t('settings.theme')} className="grid grid-cols-2 gap-3">
      {followLabel && (
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          onClick={() => onChange('')}
          className={cn(
            'col-span-2 flex min-h-[52px] items-center gap-3 rounded-theme bg-surface px-4 text-left font-bold shadow-[inset_0_0_0_2px_var(--line)]',
            value === null && 'shadow-[inset_0_0_0_3px_var(--primary)]',
          )}
        >
          <span
            className={cn(
              'h-4 w-4 rounded-full',
              value === null ? 'bg-primary' : 'shadow-[inset_0_0_0_2px_var(--line)]',
            )}
            aria-hidden
          />
          {followLabel}
          {followValue && (
            <span className="ml-auto text-sm font-normal text-ink-muted">{followValue}</span>
          )}
        </button>
      )}
      {THEME_PACKS.map((pack) => {
        const selected = value === pack.id;
        return (
          // A div, not a button: the preview inside contains (inert) buttons.
          <div
            key={pack.id}
            role="radio"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onChange(pack.id);
              }
            }}
            aria-checked={selected}
            aria-label={`${pack.name}. ${pack.description}`}
            onClick={() => onChange(pack.id)}
            className={cn(
              'cursor-pointer overflow-hidden rounded-theme bg-surface text-left transition-shadow',
              selected ? 'shadow-[0_0_0_3px_var(--primary)]' : 'shadow-[0_0_0_1.5px_var(--line)]',
            )}
          >
            <ScaledPreview themeId={pack.id} mode={mode} props={preview} />
            <span className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-display">{pack.name}</span>
                <span className="line-clamp-2 block text-xs text-ink-muted">
                  {pack.description}
                </span>
              </span>
              <span
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full',
                  selected ? 'bg-primary text-primary-ink' : 'shadow-[inset_0_0_0_2px_var(--line)]',
                )}
                aria-hidden
              >
                {selected && '✓'}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
