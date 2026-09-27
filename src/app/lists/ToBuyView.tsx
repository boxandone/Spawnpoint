import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, Icon, SectionTitle, Tag, useToast } from '@/components/ui';
import { mediumDate } from '@/lib/dates';
import { useHousehold } from '@/modules/households/context';
import type { List, ListItem } from '@/modules/lists/api';
import { ItemRow } from '@/modules/lists/components/ItemRow';
import { ItemSheet } from '@/modules/lists/components/ItemSheet';
import { QuickAdd } from '@/modules/lists/components/QuickAdd';
import { useItemMutations } from '@/modules/lists/hooks';
import { linkLabel, sortToBuy, topPosition } from '@/modules/lists/logic';
import { useLocations } from '@/modules/locations/hooks';
import { locationLabel } from '@/modules/locations/logic';
import { useCopy } from '@/theme';
import { TipQueue } from '../help/Tip';

/** To buy: ideas and planned purchases. One tap marks something bought. */
export function ToBuyView({ list, items }: { list: List; items: ListItem[] }) {
  const t = useCopy();
  const toast = useToast();
  const { today, settings } = useHousehold();
  const navigate = useNavigate();
  const stuffOn = settings.modules.stuff;
  const toStuff = (item: ListItem) =>
    navigate(item.item_id ? `/stuff/${item.item_id}` : `/stuff/new?from=${item.id}`);
  const { locations } = useLocations();
  const { add, update, remove } = useItemMutations();
  const [editing, setEditing] = useState<ListItem | null>(null);

  const sorted = useMemo(() => sortToBuy(items), [items]);
  const active = sorted.filter((i) => i.status !== 'bought');
  const bought = sorted
    .filter((i) => i.status === 'bought')
    .sort((a, b) => (b.bought_on ?? '').localeCompare(a.bought_on ?? ''));

  const toggle = (item: ListItem) => {
    if (item.status === 'bought') {
      update(item.id, { status: 'to_buy' });
      return;
    }
    const before = item.status;
    update(item.id, { status: 'bought' });
    toast.show({
      message: t('toBuy.boughtToast'),
      onUndo: () => update(item.id, { status: before }),
    });
  };

  const row = (item: ListItem) => {
    const isBought = item.status === 'bought';
    const area = locationLabel(item.location_id, locations);
    const firstLink = item.links[0];
    return (
      <ItemRow
        key={item.id}
        name={item.name}
        checked={isBought}
        checkLabel={
          isBought
            ? t('lists.uncheck', { name: item.name })
            : t('toBuy.markBought', { name: item.name })
        }
        onToggle={() => toggle(item)}
        onOpen={() => setEditing(item)}
        onDelete={() => remove([item])}
        meta={
          <>
            {item.status === 'idea' && <Tag tone="secondary">{t('toBuy.status.idea')}</Tag>}
            {item.priority === 'high' && !isBought && (
              <Tag tone="accent">{t('task.priority.high')}</Tag>
            )}
            {item.target_price != null && (
              <span className="font-num font-bold text-ink">
                {item.target_price.toLocaleString(undefined, {
                  minimumFractionDigits: item.target_price % 1 ? 2 : 0,
                  maximumFractionDigits: 2,
                })}
              </span>
            )}
            {area && <span className="truncate">{area}</span>}
            {isBought && item.bought_on && (
              <span>{t('toBuy.boughtOn', { day: mediumDate(item.bought_on, today) })}</span>
            )}
          </>
        }
        trailing={
          isBought && stuffOn ? (
            <Button
              size="sm"
              variant={item.item_id ? 'ghost' : 'secondary'}
              icon="stuff"
              onClick={() => toStuff(item)}
              aria-label={
                item.item_id
                  ? t('toBuy.openInStuffNamed', { name: item.name })
                  : t('toBuy.addToStuffNamed', { name: item.name })
              }
            >
              {item.item_id ? t('toBuy.inStuff') : t('toBuy.addShort')}
            </Button>
          ) : firstLink ? (
            <a
              href={firstLink}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={linkLabel(firstLink)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-theme-sm text-ink-muted hover:bg-surface-2"
            >
              <Icon name="link" size={20} />
            </a>
          ) : undefined
        }
      />
    );
  };

  return (
    <>
      <QuickAdd
        label={t('lists.addLabel', { list: t('lists.toBuy') })}
        onAdd={(text) =>
          add([
            {
              list_id: list.id,
              name: text.trim(),
              status: 'to_buy',
              position: topPosition(items),
            },
          ])
        }
      />
      {active.length > 0 && (
        <TipQueue className="mb-3" tips={[{ id: 'lists.swipe', text: 'tip.lists.swipe' }]} />
      )}
      {active.length === 0 && bought.length === 0 ? (
        <EmptyState icon="bag" title={t('lists.empty')} body={t('lists.emptyBody')} />
      ) : active.length === 0 ? (
        <p className="py-6 text-center text-ink-muted">{t('lists.allDone')}</p>
      ) : (
        <ul className="flex flex-col gap-2">{active.map(row)}</ul>
      )}

      {bought.length > 0 && (
        <>
          <SectionTitle
            action={
              <Button variant="ghost" size="sm" onClick={() => remove(bought)}>
                {t('lists.clearDone')}
              </Button>
            }
          >
            {t('toBuy.boughtSection', { count: bought.length })}
          </SectionTitle>
          <ul className="flex flex-col gap-2">{bought.map(row)}</ul>
        </>
      )}

      {editing && (
        <ItemSheet
          key={editing.id}
          item={editing}
          kind="to_buy"
          onClose={() => setEditing(null)}
          onSave={(patch) => update(editing.id, patch)}
          onDelete={() => remove([editing])}
          onAddToStuff={stuffOn ? () => toStuff(editing) : undefined}
        />
      )}
    </>
  );
}
