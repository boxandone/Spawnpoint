import { useState, type FormEvent } from 'react';
import { Button, Segmented, Select, Sheet, Switch, TextArea, TextField } from '@/components/ui';
import { useHousehold } from '@/modules/households/context';
import { listAreas } from '@/modules/locations/logic';
import { useLocations } from '@/modules/locations/hooks';
import { useCopy, type CopyKey } from '@/theme';
import type { ListItem, ListItemPatch, ListKind } from '../api';
import {
  BUY_STATUSES,
  CATEGORIES,
  isValidLink,
  parseLinks,
  parsePrice,
  type BuyStatus,
} from '../logic';

interface ItemSheetProps {
  item: ListItem;
  kind: ListKind;
  onClose: () => void;
  onSave: (patch: ListItemPatch) => void;
  onDelete: () => void;
  onMove?: (dir: -1 | 1) => void;
  /** Groceries only. */
  isStaple?: boolean;
  onMakeStaple?: () => void;
}

/** Edit one item. The fields shown depend on the kind of list. */
export function ItemSheet({
  item,
  kind,
  onClose,
  onSave,
  onDelete,
  onMove,
  isStaple,
  onMakeStaple,
}: ItemSheetProps) {
  const t = useCopy();
  const { members } = useHousehold();
  const { locations } = useLocations();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity ?? '');
  const [category, setCategory] = useState(item.category ?? 'other');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [status, setStatus] = useState<BuyStatus>((item.status as BuyStatus) ?? 'to_buy');
  const [priority, setPriority] = useState(item.priority);
  const [price, setPrice] = useState(item.target_price == null ? '' : String(item.target_price));
  const [links, setLinks] = useState(item.links.join('\n'));
  const [locationId, setLocationId] = useState(item.location_id ?? '');
  const [dueOn, setDueOn] = useState(item.due_on ?? '');
  const [assignee, setAssignee] = useState(item.assignee_id ?? '');
  const [discuss, setDiscuss] = useState(item.discuss);
  const parsedLinks = parseLinks(links);
  const linksError = parsedLinks.invalid.length > 0 ? t('toBuy.linksInvalid') : undefined;

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || linksError) return;
    const patch: ListItemPatch = { name: name.trim(), notes: notes.trim() || null };
    if (kind === 'groceries') {
      patch.quantity = quantity.trim() || null;
      patch.category = category;
    }
    if (kind === 'to_buy') {
      patch.status = status;
      patch.priority = priority;
      patch.target_price = parsePrice(price);
      patch.links = parsedLinks.links.filter(isValidLink);
      patch.location_id = locationId || null;
    }
    if (kind === 'todo') {
      patch.due_on = dueOn || null;
      patch.assignee_id = assignee || null;
      patch.discuss = discuss;
    }
    onSave(patch);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={item.name}
      footer={
        <div className="flex gap-2">
          <Button
            variant="ghost"
            icon="trash"
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            {t('common.delete')}
          </Button>
          <Button type="submit" form="list-item-form" block>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <form id="list-item-form" onSubmit={save} className="flex flex-col gap-4">
        <TextField
          label={t('lists.itemName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          required
        />

        {kind === 'groceries' && (
          <>
            <TextField
              label={t('grocery.quantity')}
              hint={t('common.optional')}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              maxLength={40}
            />
            <Select
              label={t('grocery.category')}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`grocery.cat.${c}` as CopyKey)}
                </option>
              ))}
            </Select>
            {onMakeStaple && (
              <Button
                variant="secondary"
                icon={isStaple ? 'check' : 'star'}
                disabled={isStaple}
                onClick={onMakeStaple}
              >
                {isStaple ? t('grocery.isStaple') : t('grocery.makeStaple')}
              </Button>
            )}
          </>
        )}

        {kind === 'to_buy' && (
          <>
            <Segmented
              label={t('toBuy.status')}
              value={status}
              onChange={setStatus}
              options={BUY_STATUSES.map((s) => ({
                value: s,
                label: t(`toBuy.status.${s}` as CopyKey),
              }))}
            />
            <Segmented
              label={t('task.priority')}
              value={priority as 'low' | 'normal' | 'high'}
              onChange={setPriority}
              options={(['low', 'normal', 'high'] as const).map((p) => ({
                value: p,
                label: t(`task.priority.${p}` as CopyKey),
              }))}
            />
            <TextField
              label={t('toBuy.price')}
              hint={t('common.optional')}
              inputMode="decimal"
              placeholder={t('toBuy.pricePlaceholder')}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              maxLength={14}
            />
            <Select
              label={t('toBuy.area')}
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">{t('toBuy.noArea')}</option>
              {listAreas(locations).map(({ area, zone }) => (
                <option key={area.id} value={area.id}>
                  {zone ? `${zone.name} · ${area.name}` : area.name}
                </option>
              ))}
            </Select>
            <TextArea
              label={t('toBuy.links')}
              hint={linksError ?? t('toBuy.linksHint')}
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              rows={3}
              inputMode="url"
            />
            {status === 'bought' && (
              <p className="text-sm text-ink-muted">{t('toBuy.stuffSoon')}</p>
            )}
          </>
        )}

        {kind === 'todo' && (
          <>
            <TextField
              label={t('todo.due')}
              hint={t('common.optional')}
              type="date"
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
            />
            <Select
              label={t('todo.assignee')}
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">{t('common.anyone')}</option>
              {members
                .filter((m) => m.status === 'active')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
            </Select>
            <Switch
              label={t('todo.discuss')}
              description={t('todo.discussHint')}
              checked={discuss}
              onChange={setDiscuss}
            />
          </>
        )}

        <TextArea
          label={t('lists.notes')}
          hint={t('common.optional')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={2000}
        />

        {onMove && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => onMove(-1)}>
              {t('lists.moveUp')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onMove(1)}>
              {t('lists.moveDown')}
            </Button>
          </div>
        )}
      </form>
    </Sheet>
  );
}
