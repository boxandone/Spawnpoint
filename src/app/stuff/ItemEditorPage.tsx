import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, PageHeader, Select, Splash, TextArea, TextField, useToast } from '@/components/ui';
import { useHousehold } from '@/modules/households/context';
import { updateItem as updateListItem } from '@/modules/lists/api';
import { useListItems } from '@/modules/lists/hooks';
import { isValidLink, parsePrice } from '@/modules/lists/logic';
import type { ItemInput } from '@/modules/stuff/api';
import { useItems, useStuffMutations } from '@/modules/stuff/hooks';
import { ITEM_CATEGORIES, ITEM_STATUSES, parseTags, prefillFromToBuy } from '@/modules/stuff/logic';
import { useCopy, type CopyKey } from '@/theme';
import { LocationSelect } from './LocationSelect';

interface Form {
  name: string;
  category: string;
  brand: string;
  model: string;
  serial: string;
  purchased_on: string;
  price: string;
  store: string;
  warranty_until: string;
  location_id: string;
  spot: string;
  tags: string;
  notes: string;
  url: string;
  barcode: string;
  status: string;
}

const EMPTY: Form = {
  name: '',
  category: 'other',
  brand: '',
  model: '',
  serial: '',
  purchased_on: '',
  price: '',
  store: '',
  warranty_until: '',
  location_id: '',
  spot: '',
  tags: '',
  notes: '',
  url: '',
  barcode: '',
  status: 'active',
};

/** Add or edit an item. Only the name is required. */
export function ItemEditorPage() {
  const t = useCopy();
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();
  const [params] = useSearchParams();
  const { household } = useHousehold();
  const items = useItems();
  const listItems = useListItems();
  const { create, update } = useStuffMutations();
  const existing = items.data?.find((i) => i.id === id);
  const fromEntry = listItems.data?.find((l) => l.id === params.get('from'));

  const initial = useMemo<Form | null>(() => {
    if (id) {
      if (!existing) return null;
      return {
        name: existing.name,
        category: existing.category,
        brand: existing.brand ?? '',
        model: existing.model ?? '',
        serial: existing.serial ?? '',
        purchased_on: existing.purchased_on ?? '',
        price: existing.price == null ? '' : String(existing.price),
        store: existing.store ?? '',
        warranty_until: existing.warranty_until ?? '',
        location_id: existing.location_id ?? '',
        spot: existing.spot ?? '',
        tags: existing.tags.join(', '),
        notes: existing.notes ?? '',
        url: existing.url ?? '',
        barcode: existing.barcode ?? '',
        status: existing.status,
      };
    }
    const form = {
      ...EMPTY,
      barcode: params.get('barcode') ?? '',
      location_id: params.get('place') ?? '',
    };
    if (fromEntry) {
      const p = prefillFromToBuy(fromEntry);
      return {
        ...form,
        name: p.name,
        price: p.price == null ? '' : String(p.price),
        purchased_on: p.purchased_on ?? '',
        location_id: p.location_id ?? '',
        notes: p.notes ?? '',
        url: p.url ?? '',
      };
    }
    return form;
  }, [id, existing, fromEntry, params]);

  if (items.isLoading || (params.get('from') && listItems.isLoading)) return <Splash />;
  if (!initial) return <Splash />;
  return (
    <Editor
      key={id ?? fromEntry?.id ?? 'new'}
      initial={initial}
      title={id ? t('stuff.edit') : t('stuff.add')}
      onCancel={() => navigate(-1)}
      onSubmit={async (input) => {
        try {
          if (id) {
            await update(id, input);
            navigate(`/stuff/${id}`, { replace: true });
          } else {
            const item = await create(input);
            if (fromEntry) await updateListItem(fromEntry.id, { item_id: item.id });
            navigate(`/stuff/${item.id}${fromEntry ? '?receipt=1' : ''}`, { replace: true });
            toast.show({ message: t('stuff.added', { name: item.name }), tone: 'success' });
          }
        } catch {
          toast.show({ message: t('common.error'), tone: 'danger' });
        }
      }}
      householdId={household.id}
    />
  );
}

function Editor({
  initial,
  title,
  onCancel,
  onSubmit,
}: {
  initial: Form;
  title: string;
  onCancel: () => void;
  onSubmit: (input: ItemInput) => Promise<void>;
  householdId: string;
}) {
  const t = useCopy();
  const [f, setF] = useState<Form>(initial);
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(
    !!(initial.brand || initial.model || initial.serial || initial.barcode || initial.url),
  );
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const urlError = f.url.trim() && !isValidLink(f.url) ? t('toBuy.linksInvalid') : undefined;
  const barcodeError =
    f.barcode.trim() && !/^[0-9A-Za-z.-]{4,64}$/.test(f.barcode.trim())
      ? t('stuff.barcodeInvalid')
      : undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || urlError || barcodeError) return;
    setBusy(true);
    const opt = (s: string) => s.trim() || null;
    await onSubmit({
      name: f.name.trim(),
      category: f.category,
      brand: opt(f.brand),
      model: opt(f.model),
      serial: opt(f.serial),
      purchased_on: f.purchased_on || null,
      price: parsePrice(f.price),
      store: opt(f.store),
      warranty_until: f.warranty_until || null,
      location_id: f.location_id || null,
      spot: opt(f.spot),
      tags: parseTags(f.tags),
      notes: opt(f.notes),
      url: opt(f.url),
      barcode: opt(f.barcode),
      status: f.status,
    });
    setBusy(false);
  };

  return (
    <div className="pb-8">
      <PageHeader title={title} back />
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <TextField
          label={t('lists.itemName')}
          value={f.name}
          onChange={(e) => set('name', e.target.value)}
          maxLength={120}
          required
          autoFocus={!initial.name}
        />
        <LocationSelect
          label={t('stuff.where')}
          value={f.location_id}
          onChange={(v) => set('location_id', v)}
        />
        <TextField
          label={t('stuff.spot')}
          hint={t('stuff.spotHint')}
          value={f.spot}
          onChange={(e) => set('spot', e.target.value)}
          maxLength={120}
        />
        <Select
          label={t('stuff.category')}
          value={f.category}
          onChange={(e) => set('category', e.target.value)}
        >
          {ITEM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`stuff.cat.${c}` as CopyKey)}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label={t('stuff.purchasedOn')}
            type="date"
            value={f.purchased_on}
            onChange={(e) => set('purchased_on', e.target.value)}
          />
          <TextField
            label={t('stuff.price')}
            inputMode="decimal"
            value={f.price}
            onChange={(e) => set('price', e.target.value)}
            maxLength={14}
          />
        </div>
        <TextField
          label={t('stuff.store')}
          value={f.store}
          onChange={(e) => set('store', e.target.value)}
          maxLength={80}
        />
        <TextField
          label={t('stuff.warrantyUntil')}
          type="date"
          value={f.warranty_until}
          onChange={(e) => set('warranty_until', e.target.value)}
        />
        <TextField
          label={t('stuff.tags')}
          hint={t('stuff.tagsHint')}
          value={f.tags}
          onChange={(e) => set('tags', e.target.value)}
        />
        <Select
          label={t('stuff.statusLabel')}
          value={f.status}
          onChange={(e) => set('status', e.target.value)}
        >
          {ITEM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`stuff.status.${s}` as CopyKey)}
            </option>
          ))}
        </Select>
        <TextArea
          label={t('lists.notes')}
          value={f.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          maxLength={4000}
        />

        {more ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label={t('stuff.brand')}
                value={f.brand}
                onChange={(e) => set('brand', e.target.value)}
                maxLength={80}
              />
              <TextField
                label={t('stuff.model')}
                value={f.model}
                onChange={(e) => set('model', e.target.value)}
                maxLength={80}
              />
            </div>
            <TextField
              label={t('stuff.serial')}
              value={f.serial}
              onChange={(e) => set('serial', e.target.value)}
              maxLength={80}
            />
            <TextField
              label={t('stuff.url')}
              hint={urlError ?? t('stuff.urlHint')}
              type="url"
              inputMode="url"
              value={f.url}
              onChange={(e) => set('url', e.target.value)}
              maxLength={500}
            />
            <TextField
              label={t('stuff.barcode')}
              hint={barcodeError ?? t('stuff.barcodeHint')}
              value={f.barcode}
              onChange={(e) => set('barcode', e.target.value)}
              maxLength={64}
            />
          </>
        ) : (
          <Button variant="ghost" icon="down" onClick={() => setMore(true)}>
            {t('stuff.moreDetails')}
          </Button>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" block loading={busy} disabled={!f.name.trim()}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
