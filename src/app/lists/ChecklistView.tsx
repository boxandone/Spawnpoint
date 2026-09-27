import { useMemo, useState } from 'react';
import { Avatar, Button, EmptyState, SectionTitle, Segmented, Tag } from '@/components/ui';
import { shortDay } from '@/lib/dates';
import { useHousehold } from '@/modules/households/context';
import type { List, ListItem } from '@/modules/lists/api';
import { ItemRow } from '@/modules/lists/components/ItemRow';
import { ItemSheet } from '@/modules/lists/components/ItemSheet';
import { QuickAdd } from '@/modules/lists/components/QuickAdd';
import { useSortable } from '@/modules/lists/components/useSortable';
import { useItemMutations, useListTitle } from '@/modules/lists/hooks';
import { byPosition, positionForMove, topPosition } from '@/modules/lists/logic';
import { useCopy } from '@/theme';
import { TipQueue } from '../help/Tip';

/** To-do and custom lists: check things off, reorder, clear what's done. */
export function ChecklistView({ list, items }: { list: List; items: ListItem[] }) {
  const t = useCopy();
  const title = useListTitle();
  const { member, memberById, today } = useHousehold();
  const { add, update, remove } = useItemMutations();
  const [editing, setEditing] = useState<ListItem | null>(null);
  const [who, setWho] = useState<'all' | 'mine'>('all');
  const isTodo = list.kind === 'todo';

  const open = useMemo(
    () =>
      byPosition(
        items.filter(
          (i) =>
            !i.checked && (who === 'all' || i.assignee_id === null || i.assignee_id === member.id),
        ),
      ),
    [items, who, member.id],
  );
  const done = useMemo(
    () =>
      items
        .filter((i) => i.checked)
        .sort((a, b) => (b.checked_at ?? '').localeCompare(a.checked_at ?? '')),
    [items],
  );
  const move = (from: number, to: number) => {
    const moved = open[from];
    if (moved) update(moved.id, { position: positionForMove(open, from, to) });
  };
  const sortable = useSortable(open.length, move);

  const onAdd = (text: string) => {
    add([{ list_id: list.id, name: text.trim(), position: topPosition(items) }]);
  };

  const row = (item: ListItem, index: number | null) => {
    const assignee = memberById(item.assignee_id);
    const meta = isTodo ? (
      <>
        {item.due_on && (
          <Tag tone="accent">
            {item.due_on === today
              ? t('todo.dueToday')
              : t('todo.dueOn', { day: shortDay(item.due_on, today) })}
          </Tag>
        )}
        {item.discuss && <Tag tone="secondary">{t('todo.discussTag')}</Tag>}
        {item.notes && <span className="truncate">{item.notes}</span>}
      </>
    ) : item.notes ? (
      <span className="truncate">{item.notes}</span>
    ) : null;
    return (
      <ItemRow
        key={item.id}
        name={item.name}
        checked={item.checked}
        checkLabel={
          item.checked
            ? t('lists.uncheck', { name: item.name })
            : t('lists.check', { name: item.name })
        }
        onToggle={() => update(item.id, { checked: !item.checked })}
        onOpen={() => setEditing(item)}
        onDelete={() => remove([item])}
        meta={meta}
        trailing={
          assignee && !item.checked ? (
            <Avatar
              avatar={assignee.avatar}
              color={assignee.color}
              name={assignee.display_name}
              size={28}
            />
          ) : undefined
        }
        handle={index !== null && open.length > 1 ? sortable.handleProps(index) : undefined}
        style={index !== null ? sortable.styleFor(index) : undefined}
        dragging={index !== null && sortable.draggingIndex === index}
      />
    );
  };

  return (
    <>
      <QuickAdd label={t('lists.addLabel', { list: title(list) })} onAdd={onAdd} />
      {isTodo && (
        <Segmented
          label={t('todo.assignee')}
          value={who}
          onChange={setWho}
          options={[
            { value: 'all', label: t('todo.all') },
            { value: 'mine', label: t('todo.mine') },
          ]}
          className="mb-3"
        />
      )}

      {open.length > 0 && (
        <TipQueue className="mb-3" tips={[{ id: 'lists.swipe', text: 'tip.lists.swipe' }]} />
      )}
      {open.length === 0 && done.length === 0 ? (
        <EmptyState icon="lists" title={t('lists.empty')} body={t('lists.emptyBody')} />
      ) : open.length === 0 ? (
        <p className="py-6 text-center text-ink-muted">{t('lists.allDone')}</p>
      ) : (
        <ul className="flex flex-col gap-2">{open.map((item, i) => row(item, i))}</ul>
      )}

      {done.length > 0 && (
        <>
          <SectionTitle
            action={
              <Button variant="ghost" size="sm" onClick={() => remove(done)}>
                {t('lists.clearDone')}
              </Button>
            }
          >
            {t('lists.doneSection', { count: done.length })}
          </SectionTitle>
          <ul className="flex flex-col gap-2">{done.map((item) => row(item, null))}</ul>
        </>
      )}

      {editing && (
        <ItemSheet
          key={editing.id}
          item={editing}
          kind={isTodo ? 'todo' : 'custom'}
          onClose={() => setEditing(null)}
          onSave={(patch) => update(editing.id, patch)}
          onDelete={() => remove([editing])}
          onMove={
            editing.checked
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
