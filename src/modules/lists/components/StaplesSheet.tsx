import { useState, type FormEvent } from 'react';
import { Chip, Icon, IconButton, Sheet } from '@/components/ui';
import { useCopy } from '@/theme';
import type { Staple } from '../api';
import { nameKey } from '../logic';

interface StaplesSheetProps {
  open: boolean;
  onClose: () => void;
  staples: Staple[];
  /** Names already waiting on the list. */
  onList: readonly string[];
  onAddToList: (staple: Staple) => void;
  onCreate: (name: string) => void;
  onRemove: (staple: Staple) => void;
}

/** Recurring groceries: one tap puts a staple back on the list. */
export function StaplesSheet({
  open,
  onClose,
  staples,
  onList,
  onAddToList,
  onCreate,
  onRemove,
}: StaplesSheetProps) {
  const t = useCopy();
  const [name, setName] = useState('');
  const taken = new Set(onList.map(nameKey));

  const create = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
    setName('');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('grocery.staples')}
      description={t('grocery.staplesBody')}
    >
      {staples.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('grocery.staplesEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {staples.map((s) => {
            const on = taken.has(nameKey(s.name));
            return (
              <li key={s.id} className="flex items-center gap-2">
                <Chip
                  selected={on}
                  disabled={on}
                  onClick={() => onAddToList(s)}
                  leading={<Icon name={on ? 'check' : 'plus'} size={14} strokeWidth={2.5} />}
                  aria-label={
                    on
                      ? `${s.name}: ${t('grocery.onList')}`
                      : t('grocery.addNamed', { name: s.name })
                  }
                  className="flex-1 justify-start"
                >
                  <span className="truncate">{s.name}</span>
                  {s.quantity && <span className="font-normal opacity-80">· {s.quantity}</span>}
                </Chip>
                <IconButton
                  icon="close"
                  label={t('grocery.removeStaple', { name: s.name })}
                  onClick={() => onRemove(s)}
                  className="text-ink-muted"
                />
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={create} className="mt-4 flex gap-2">
        <label htmlFor="new-staple" className="sr-only">
          {t('grocery.addStaple')}
        </label>
        <input
          id="new-staple"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('grocery.addStaple')}
          maxLength={200}
          className="sp-input min-h-[48px] flex-1"
        />
        <button
          type="submit"
          aria-label={t('grocery.addStaple')}
          className="sp-btn sp-btn-secondary grid min-h-[48px] w-12 place-items-center px-0"
        >
          <Icon name="plus" size={20} strokeWidth={2.5} />
        </button>
      </form>
    </Sheet>
  );
}
