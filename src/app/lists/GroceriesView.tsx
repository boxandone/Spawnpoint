import { useMemo, useRef, useState } from 'react';
import { Button, EmptyState, SectionTitle, Segmented, useToast } from '@/components/ui';
import type { List, ListItem } from '@/modules/lists/api';
import { ItemRow } from '@/modules/lists/components/ItemRow';
import { ItemSheet } from '@/modules/lists/components/ItemSheet';
import { QuickAdd } from '@/modules/lists/components/QuickAdd';
import { StaplesSheet } from '@/modules/lists/components/StaplesSheet';
import { useSortable } from '@/modules/lists/components/useSortable';
import {
  useDoneShopping,
  useGrocerySuggestions,
  useItemMutations,
  useStapleMutations,
  useStaples,
} from '@/modules/lists/hooks';
import {
  byPosition,
  groupByCategory,
  guessCategory,
  isCategory,
  nameKey,
  parseQuickAdd,
  positionForMove,
  topPosition,
  type Suggestion,
} from '@/modules/lists/logic';
import { useCopy, type CopyKey } from '@/theme';
import { TipQueue } from '../help/Tip';

type Mode = 'list' | 'store';
const MODE_KEY = 'sp.grocery.mode';

function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'store' ? 'store' : 'list';
  } catch {
    return 'list';
  }
}

/** Groceries: a list at home, grouped by aisle at the store, then Done shopping. */
export function GroceriesView({ list, items }: { list: List; items: ListItem[] }) {
  const t = useCopy();
  const toast = useToast();
  const { add, update, remove } = useItemMutations();
  const staples = useStaples();
  const stapleMut = useStapleMutations();
  const doneShopping = useDoneShopping();
  const [mode, setModeState] = useState<Mode>(readMode);
  const [editing, setEditing] = useState<ListItem | null>(null);
  const [staplesOpen, setStaplesOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const doneRef = useRef<HTMLButtonElement>(null);
  const history = useGrocerySuggestions(true);

  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* per-device convenience only */
    }
  };

  const open = useMemo(() => byPosition(items.filter((i) => !i.checked)), [items]);
  const cart = useMemo(
    () =>
      items
        .filter((i) => i.checked)
        .sort((a, b) => (b.checked_at ?? '').localeCompare(a.checked_at ?? '')),
    [items],
  );
  const onList = useMemo(() => open.map((i) => i.name), [open]);
  const stapleList = useMemo(() => staples.data ?? [], [staples.data]);
  const stapleKeys = useMemo(() => new Set(stapleList.map((s) => nameKey(s.name))), [stapleList]);
  const pool = useMemo<Suggestion[]>(
    () => [...stapleList.map((s) => ({ ...s, staple: true })), ...(history.data ?? [])],
    [stapleList, history.data],
  );

  const move = (from: number, to: number) => {
    const moved = open[from];
    if (moved) update(moved.id, { position: positionForMove(open, from, to) });
  };
  const sortable = useSortable(open.length, move);

  const addItem = (input: { name: string; quantity: string | null; category: string | null }) => {
    const name = input.name.trim();
    if (!name) return;
    if (open.some((i) => nameKey(i.name) === nameKey(name))) {
      toast.show({ message: t('grocery.already', { name }) });
      return;
    }
    add([
      {
        list_id: list.id,
        name,
        quantity: input.quantity,
        category: isCategory(input.category) ? input.category : guessCategory(name),
        position: topPosition(items),
      },
    ]);
  };

  const onQuickAdd = (text: string, picked?: Suggestion) => {
    if (picked) addItem(picked);
    else addItem({ ...parseQuickAdd(text), category: null });
  };

  const row = (item: ListItem, index: number | null) => (
    <ItemRow
      key={item.id}
      name={item.name}
      checked={item.checked}
      checkLabel={
        item.checked
          ? t('grocery.putBack', { name: item.name })
          : t('lists.check', { name: item.name })
      }
      onToggle={() => update(item.id, { checked: !item.checked })}
      onOpen={() => setEditing(item)}
      onDelete={() => remove([item])}
      meta={
        item.quantity || mode === 'list' ? (
          <>
            {item.quantity && <span className="font-bold text-ink">{item.quantity}</span>}
            {mode === 'list' && (
              <span>
                {t(`grocery.cat.${isCategory(item.category) ? item.category : 'other'}` as CopyKey)}
              </span>
            )}
          </>
        ) : null
      }
      handle={index !== null && open.length > 1 ? sortable.handleProps(index) : undefined}
      style={index !== null ? sortable.styleFor(index) : undefined}
      dragging={index !== null && sortable.draggingIndex === index}
    />
  );

  const finish = async () => {
    setBusy(true);
    await doneShopping(list.id, cart, doneRef.current);
    setBusy(false);
  };

  return (
    <>
      <QuickAdd
        label={t('lists.addLabel', { list: t('lists.groceries') })}
        onAdd={onQuickAdd}
        suggestions={pool}
        onList={onList}
      />
      <div className="mb-3 flex items-end gap-2">
        <Segmented
          label={t('grocery.mode')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'list', label: t('grocery.listMode') },
            { value: 'store', label: t('grocery.storeMode') },
          ]}
          className="flex-1"
        />
        <Button variant="secondary" icon="star" onClick={() => setStaplesOpen(true)}>
          {t('grocery.staples')}
        </Button>
      </div>
      {open.length > 0 && (
        <TipQueue
          className="mb-3"
          tips={[
            { id: 'lists.swipe', text: 'tip.lists.swipe' },
            { id: 'grocery.store', text: 'tip.grocery.store' },
          ]}
        />
      )}

      {open.length === 0 && cart.length === 0 ? (
        <EmptyState icon="cart" title={t('lists.empty')} body={t('lists.emptyBody')} />
      ) : open.length === 0 ? (
        <p className="py-6 text-center text-ink-muted">{t('lists.allDone')}</p>
      ) : mode === 'list' ? (
        <ul className="flex flex-col gap-2">{open.map((item, i) => row(item, i))}</ul>
      ) : (
        groupByCategory(open).map((g) => (
          <section key={g.category} aria-labelledby={`aisle-${g.category}`}>
            <h3
              id={`aisle-${g.category}`}
              className="mb-2 mt-5 px-1 text-sm font-bold uppercase tracking-wide text-ink-muted"
            >
              {t(`grocery.cat.${g.category}` as CopyKey)}
            </h3>
            <ul className="flex flex-col gap-2">{g.items.map((item) => row(item, null))}</ul>
          </section>
        ))
      )}

      {cart.length > 0 && (
        <>
          <SectionTitle>{t('grocery.inCart', { count: cart.length })}</SectionTitle>
          <ul className="flex flex-col gap-2">{cart.map((item) => row(item, null))}</ul>
          <Button
            ref={doneRef}
            block
            size="lg"
            icon="check"
            className="mt-4"
            loading={busy}
            onClick={() => void finish()}
          >
            {t('grocery.doneShopping')}
          </Button>
        </>
      )}

      <StaplesSheet
        open={staplesOpen}
        onClose={() => setStaplesOpen(false)}
        staples={stapleList}
        onList={onList}
        onAddToList={(s) => addItem(s)}
        onCreate={(name) => {
          const parsed = parseQuickAdd(name);
          void stapleMut.add({ ...parsed, category: guessCategory(parsed.name) });
        }}
        onRemove={(s) => void stapleMut.remove(s)}
      />

      {editing && (
        <ItemSheet
          key={editing.id}
          item={editing}
          kind="groceries"
          onClose={() => setEditing(null)}
          onSave={(patch) => update(editing.id, patch)}
          onDelete={() => remove([editing])}
          isStaple={stapleKeys.has(nameKey(editing.name))}
          onMakeStaple={() =>
            void stapleMut.add({
              name: editing.name,
              quantity: editing.quantity,
              category: editing.category,
            })
          }
          onMove={
            editing.checked || mode === 'store'
              ? undefined
              : (dir) => {
                  const from = open.findIndex((i) => i.id === editing.id);
                  if (from >= 0) move(from, from + dir);
                }
          }
        />
      )}
    </>
  );
}
