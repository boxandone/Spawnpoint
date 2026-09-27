import { useId, useState, type FormEvent } from 'react';
import { Chip, Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useCopy } from '@/theme';
import { matchSuggestions, type Suggestion } from '../logic';

interface QuickAddProps {
  label: string;
  onAdd: (text: string, picked?: Suggestion) => void;
  /** Groceries: staples and past purchases to pick from while typing. */
  suggestions?: readonly Suggestion[];
  onList?: readonly string[];
}

/** The always-there add box at the top of a list. Enter adds and keeps focus. */
export function QuickAdd({ label, onAdd, suggestions, onList = [] }: QuickAddProps) {
  const t = useCopy();
  const [text, setText] = useState('');
  const listId = useId();
  const matches = suggestions ? matchSuggestions(text, suggestions, onList) : [];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text);
    setText('');
  };

  return (
    <div className="sticky top-0 z-10 -mx-4 bg-bg px-4 pb-2 pt-1">
      <form onSubmit={submit} className="flex gap-2">
        <label className="sr-only" htmlFor={`${listId}-input`}>
          {label}
        </label>
        <input
          id={`${listId}-input`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('lists.addPlaceholder')}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={200}
          aria-controls={matches.length ? `${listId}-list` : undefined}
          className="sp-input min-h-[48px] flex-1"
        />
        <button
          type="submit"
          aria-label={t('common.add')}
          className="sp-btn sp-btn-primary grid min-h-[48px] w-12 place-items-center px-0"
        >
          <Icon name="plus" size={22} strokeWidth={2.5} />
        </button>
      </form>
      {matches.length > 0 && (
        <ul
          id={`${listId}-list`}
          aria-label={t('grocery.suggestions')}
          className="mt-2 flex flex-wrap gap-2"
        >
          {matches.map((s) => (
            <li key={s.name}>
              <Chip
                aria-pressed={undefined}
                leading={<Icon name="plus" size={14} strokeWidth={2.5} />}
                onClick={() => {
                  onAdd(s.name, s);
                  setText('');
                }}
                className={cn(s.staple && 'font-bold')}
              >
                {s.name}
                {s.quantity && <span className="font-normal text-ink-muted">· {s.quantity}</span>}
              </Chip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
