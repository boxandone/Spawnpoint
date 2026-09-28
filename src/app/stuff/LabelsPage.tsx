import { useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Button, Chip, PageHeader, Segmented, Splash, TextField } from '@/components/ui';
import { useLocations } from '@/modules/locations/hooks';
import { buildTree, locationLabel } from '@/modules/locations/logic';
import { QrCode } from '@/modules/stuff/components/QrCode';
import { recordLabelsPrinted } from '@/modules/stuff/api';
import { useItems, useShortCodes } from '@/modules/stuff/hooks';
import {
  LABEL_STOCKS,
  labelUrl,
  paginateLabels,
  searchItems,
  type LabelStock,
} from '@/modules/stuff/logic';
import { useQueryClient } from '@tanstack/react-query';
import { useCopy } from '@/theme';

interface Label {
  key: string;
  code: string;
  name: string;
  sub: string | null;
}

const SHEET_PX = 816; // 8.5in at 96px per inch

/** Pick items and places, then print a sheet of QR labels. */
export function LabelsPage() {
  const t = useCopy();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const items = useItems();
  const codes = useShortCodes();
  const { locations } = useLocations();
  const [picked, setPicked] = useState<Set<string>>(
    () =>
      new Set(
        [
          ...(params.get('items')?.split(',') ?? []),
          ...(params.get('places')?.split(',') ?? []),
        ].filter(Boolean),
      ),
  );
  const [tab, setTab] = useState<'items' | 'places'>(params.get('places') ? 'places' : 'items');
  const [query, setQuery] = useState('');
  const [stockId, setStockId] = useState<LabelStock['id']>('address30');
  const [skip, setSkip] = useState('0');
  const stock = LABEL_STOCKS.find((s) => s.id === stockId) ?? (LABEL_STOCKS[0] as LabelStock);

  const liveItems = useMemo(() => (items.data ?? []).filter((i) => !i.archived_at), [items.data]);
  const places = useMemo(() => {
    const out: Array<{ id: string; name: string; sub: string | null }> = [];
    const walk = (nodes: ReturnType<typeof buildTree>, parent: string | null) => {
      for (const n of nodes) {
        out.push({ id: n.location.id, name: n.location.name, sub: parent });
        walk(n.children, parent ? `${parent} · ${n.location.name}` : n.location.name);
      }
    };
    walk(buildTree(locations), null);
    return out;
  }, [locations]);

  const labels = useMemo<Label[]>(() => {
    const out: Label[] = [];
    for (const i of liveItems) {
      const code = codes.byItem.get(i.id);
      if (picked.has(i.id) && code) {
        out.push({ key: i.id, code, name: i.name, sub: locationLabel(i.location_id, locations) });
      }
    }
    for (const p of places) {
      const code = codes.byLocation.get(p.id);
      if (picked.has(p.id) && code) out.push({ key: p.id, code, name: p.name, sub: p.sub });
    }
    return out;
  }, [liveItems, places, picked, codes, locations]);

  if (items.isLoading || codes.isLoading) return <Splash />;

  const perSheet = stock.columns * stock.rows;
  const sheets = paginateLabels(labels, perSheet, Number(skip) || 0);
  const scale = Math.min(1, (Math.min(window.innerWidth, 640) - 32) / SHEET_PX);
  const origin = window.location.origin;

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const shownItems = searchItems(liveItems, query, (id) => locationLabel(id, locations));
  const shownPlaces = places.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  const print = async () => {
    try {
      await recordLabelsPrinted(labels.length);
      void qc.invalidateQueries({ queryKey: ['rewards'] });
    } catch {
      /* printing still works; the badge count just won't move */
    }
    window.print();
  };

  return (
    <div className="pb-8">
      <PageHeader title={t('labels.title')} subtitle={t('labels.body')} back="/stuff" />

      <Segmented
        label={t('labels.what')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'items', label: t('stuff.name') },
          { value: 'places', label: t('labels.places') },
        ]}
      />
      <input
        type="search"
        aria-label={t('stuff.search')}
        placeholder={t('stuff.search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="sp-input my-3 min-h-[48px] w-full"
      />
      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-theme bg-surface-2 p-2">
        {(tab === 'items'
          ? shownItems.map((i) => ({
              id: i.id,
              name: i.name,
              sub: locationLabel(i.location_id, locations),
            }))
          : shownPlaces
        ).map((row) => (
          <li key={row.id}>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-theme-sm px-2 hover:bg-surface">
              <input
                type="checkbox"
                checked={picked.has(row.id)}
                onChange={() => toggle(row.id)}
                className="h-5 w-5 accent-[var(--primary)]"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{row.name}</span>
                {row.sub && (
                  <span className="block truncate text-[13px] text-ink-muted">{row.sub}</span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {picked.size > 0 && (
        <Chip className="mt-2" onClick={() => setPicked(new Set())}>
          {t('labels.clear', { count: labels.length })}
        </Chip>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <Segmented
          label={t('labels.stock')}
          value={stockId}
          onChange={setStockId}
          options={LABEL_STOCKS.map((s) => ({ value: s.id, label: t(`labels.stock.${s.id}`) }))}
        />
        <TextField
          label={t('labels.skip')}
          type="number"
          inputMode="numeric"
          min={0}
          max={perSheet - 1}
          value={skip}
          onChange={(e) => setSkip(e.target.value)}
          className="max-w-[10rem]"
        />
      </div>

      <Button
        block
        size="lg"
        icon="check"
        className="mt-4"
        disabled={labels.length === 0}
        onClick={() => void print()}
      >
        {t('labels.printCount', { count: labels.length })}
      </Button>
      <p className="mt-2 text-sm text-ink-muted">{t('labels.printHint')}</p>

      {labels.length > 0 && (
        <div className="mt-4" aria-hidden>
          {sheets.map((sheet, si) => (
            <div
              key={si}
              className="mb-3 overflow-hidden"
              style={{ width: SHEET_PX * scale, height: 1056 * scale }}
            >
              <Sheet
                sheet={sheet}
                stock={stock}
                origin={origin}
                style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
              />
            </div>
          ))}
        </div>
      )}
      {labels.length > 0 &&
        createPortal(
          <div className="sp-print-portal">
            {sheets.map((sheet, si) => (
              <Sheet key={si} sheet={sheet} stock={stock} origin={origin} />
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

function Sheet({
  sheet,
  stock,
  origin,
  style,
}: {
  sheet: Array<Label | null>;
  stock: LabelStock;
  origin: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className="sp-label-sheet shadow-card"
      style={{
        ...style,
        paddingTop: stock.marginTop,
        paddingLeft: stock.marginLeft,
        display: 'grid',
        gridTemplateColumns: `repeat(${stock.columns}, ${stock.width})`,
        gridAutoRows: stock.height,
        columnGap: stock.gapX,
        rowGap: stock.gapY,
      }}
    >
      {sheet.map((label, li) => (
        <LabelCell key={label?.key ?? `blank-${li}`} label={label} stock={stock} origin={origin} />
      ))}
    </div>
  );
}

function LabelCell({
  label,
  stock,
  origin,
}: {
  label: Label | null;
  stock: LabelStock;
  origin: string;
}) {
  if (!label) return <div aria-hidden />;
  const square = stock.id === 'square2';
  return (
    <div
      className={
        square
          ? 'flex flex-col items-center justify-center gap-[0.05in] overflow-hidden p-[0.1in] text-center'
          : 'flex items-center gap-[0.08in] overflow-hidden px-[0.1in]'
      }
    >
      <QrCode value={labelUrl(origin, label.code)} size={square ? 125 : 82} className="shrink-0" />
      <div className="min-w-0 leading-tight">
        <div className="line-clamp-2 text-[11pt] font-bold">{label.name}</div>
        {label.sub && <div className="truncate text-[8pt]">{label.sub}</div>}
        <div className="font-mono text-[7pt] tracking-wider">{label.code}</div>
      </div>
    </div>
  );
}
