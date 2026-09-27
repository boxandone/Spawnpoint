import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Chip,
  EmptyState,
  Icon,
  IconButton,
  PageHeader,
  Sheet,
  Splash,
  TextField,
  useToast,
} from '@/components/ui';
import { updateList } from '@/modules/lists/api';
import { useListItems, useLists, useListTitle } from '@/modules/lists/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryKeys';
import { useHousehold } from '@/modules/households/context';
import { useCopy } from '@/theme';
import { ChecklistView } from './ChecklistView';
import { GroceriesView } from './GroceriesView';
import { LIST_ICONS, listIcon } from './listMeta';
import { ToBuyView } from './ToBuyView';

export function ListPage() {
  const t = useCopy();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { household } = useHousehold();
  const lists = useLists();
  const allItems = useListItems();
  const title = useListTitle();
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('lists');

  const list = lists.data?.find((l) => l.id === id);
  const items = useMemo(
    () => (allItems.data ?? []).filter((i) => i.list_id === id),
    [allItems.data, id],
  );

  if (lists.isLoading || allItems.isLoading) return <Splash />;
  if (!list) {
    return (
      <div>
        <PageHeader title={t('lists.name')} back="/lists" />
        <EmptyState icon="lists" title={t('lists.notFound')} />
      </div>
    );
  }

  const refreshLists = () => qc.invalidateQueries({ queryKey: qk.lists(household.id) });
  const rename = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await updateList(list.id, { name: name.trim(), icon });
      setMenuOpen(false);
    } catch {
      toast.show({ message: t('common.error'), tone: 'danger' });
    }
    await refreshLists();
  };
  const archive = async () => {
    try {
      await updateList(list.id, { archived_at: new Date().toISOString() });
    } catch {
      toast.show({ message: t('common.error'), tone: 'danger' });
      return;
    }
    await refreshLists();
    navigate('/lists');
    toast.show({
      message: t('lists.archived'),
      onUndo: async () => {
        await updateList(list.id, { archived_at: null });
        await refreshLists();
      },
    });
  };

  return (
    <div className="pb-6">
      <PageHeader
        title={title(list)}
        back="/lists"
        action={
          list.kind === 'custom' ? (
            <IconButton
              icon="more"
              label={t('lists.rename')}
              onClick={() => {
                setName(list.name ?? '');
                setIcon(listIcon(list));
                setMenuOpen(true);
              }}
            />
          ) : undefined
        }
      />
      {list.kind === 'groceries' ? (
        <GroceriesView list={list} items={items} />
      ) : list.kind === 'to_buy' ? (
        <ToBuyView list={list} items={items} />
      ) : (
        <ChecklistView list={list} items={items} />
      )}

      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={t('lists.rename')}
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" icon="archive" onClick={() => void archive()}>
              {t('lists.archive')}
            </Button>
            <Button type="submit" form="rename-list" block>
              {t('common.save')}
            </Button>
          </div>
        }
      >
        <form id="rename-list" onSubmit={(e) => void rename(e)} className="flex flex-col gap-4">
          <TextField
            label={t('lists.newName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
          />
          <IconPicker value={icon} onChange={setIcon} />
        </form>
      </Sheet>
    </div>
  );
}

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useCopy();
  return (
    <fieldset>
      <legend className="mb-1.5 px-0.5 text-sm font-bold">{t('lists.icon')}</legend>
      <div className="flex flex-wrap gap-2">
        {LIST_ICONS.map((i, n) => (
          <Chip
            key={i}
            selected={value === i}
            onClick={() => onChange(i)}
            aria-label={t('lists.iconOption', { n: n + 1 })}
            className="w-12 justify-center px-0"
          >
            <Icon name={i} size={20} />
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}
