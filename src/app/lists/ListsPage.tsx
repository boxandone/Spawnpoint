import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Icon, PageHeader, Sheet, Splash, TextField, useToast } from '@/components/ui';
import { qk } from '@/lib/queryKeys';
import { useHousehold } from '@/modules/households/context';
import { createList } from '@/modules/lists/api';
import { useListItems, useLists, useListTitle } from '@/modules/lists/hooks';
import { useCopy } from '@/theme';
import { IconPicker } from './ListPage';
import { listIcon } from './listMeta';
import { MEMBER_INK, memberColor } from '@/theme/memberColors';

const LIST_TINT: Record<string, string> = {
  groceries: 'mint',
  to_buy: 'peach',
  todo: 'sky',
  custom: 'lilac',
};

/** The Lists tab: Groceries, To buy, To-do, and the household's own lists. */
export function ListsPage() {
  const t = useCopy();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { household } = useHousehold();
  const lists = useLists();
  const items = useListItems();
  const title = useListTitle();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('lists');

  if (lists.isLoading) return <Splash />;
  const all = lists.data ?? [];

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const pos = Math.max(0, ...all.map((l) => l.position)) + 1;
      const list = await createList(household.id, name, icon, pos);
      await qc.invalidateQueries({ queryKey: qk.lists(household.id) });
      setOpen(false);
      setName('');
      navigate(`/lists/${list.id}`);
    } catch {
      toast.show({ message: t('common.error'), tone: 'danger' });
    }
  };

  return (
    <div className="pb-24">
      <PageHeader
        hero
        title={t('lists.name')}
        action={
          <Button size="sm" icon="plus" onClick={() => setOpen(true)}>
            {t('lists.new')}
          </Button>
        }
      />
      <ul className="flex flex-col gap-2">
        {all.map((list) => {
          const mine = (items.data ?? []).filter((i) => i.list_id === list.id);
          const left =
            list.kind === 'to_buy'
              ? mine.filter((i) => i.status !== 'bought').length
              : mine.filter((i) => !i.checked).length;
          return (
            <li key={list.id}>
              <Link
                to={`/lists/${list.id}`}
                className="sp-panel flex min-h-[64px] items-center gap-3 p-3"
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-theme-sm"
                  style={{
                    background: memberColor(LIST_TINT[list.kind] ?? list.icon ?? 'sand'),
                    color: MEMBER_INK,
                  }}
                >
                  <Icon name={listIcon(list)} size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{title(list)}</span>
                  <span className="block text-sm text-ink-muted">
                    {left > 0 ? t('lists.left', { count: left }) : t('lists.nothingLeft')}
                  </span>
                </span>
                <Icon name="chevron" size={18} className="text-ink-muted" />
              </Link>
            </li>
          );
        })}
      </ul>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('lists.new')}
        footer={
          <Button type="submit" form="new-list" block>
            {t('lists.create')}
          </Button>
        }
      >
        <form id="new-list" onSubmit={(e) => void create(e)} className="flex flex-col gap-4">
          <TextField
            label={t('lists.newName')}
            placeholder={t('lists.newPlaceholder')}
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
