import { useMemo, useState } from 'react';
import { Avatar, Button, Chip, Icon, Sheet, TextField } from '@/components/ui';
import { addDays, type IsoDate } from '@/lib/dates';
import type { Member } from '@/modules/households/types';
import { useCopy } from '@/theme';
import { DEED_BADGES } from '../badges';
import { getDeed } from '../deeds';

interface Props {
  open: boolean;
  onClose: () => void;
  onLog: (input: { deedKey: string; day: IsoDate; quantity: number; doneBy: string }) => void;
  members: Member[];
  me: Member;
  today: IsoDate;
}

/** "Log a fix": a searchable deed picker for one-off jobs. */
export function LogFixSheet({ open, onClose, onLog, members, me, today }: Props) {
  const t = useCopy();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [day, setDay] = useState(today);
  const [doneBy, setDoneBy] = useState(me.id);
  const [qty, setQty] = useState('1');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEED_BADGES.filter(
      (d) => !q || d.name.toLowerCase().includes(q) || d.key.includes(q.replace(/\s+/g, '_')),
    );
  }, [query]);

  const deed = picked ? getDeed(picked) : undefined;
  const unit = deed && 'unit' in deed ? deed.unit : undefined;
  const qtyNum = Number(qty);
  const valid = !!deed && (!unit || (Number.isFinite(qtyNum) && qtyNum > 0));
  const reset = () => {
    setPicked(null);
    setQuery('');
    setDay(today);
    setDoneBy(me.id);
    setQty('1');
  };
  const close = () => {
    reset();
    onClose();
  };
  const active = members.filter((m) => m.status === 'active');
  const days = [0, 1, 2].map((n) => addDays(today, -n));
  const dayLabel = (i: number) =>
    i === 0 ? t('day.today') : i === 1 ? t('day.yesterday') : t('day.daysAgo', { count: i });

  return (
    <Sheet
      open={open}
      onClose={close}
      title={deed ? deed.name : t('fix.title')}
      footer={
        deed ? (
          <Button
            block
            size="lg"
            icon="check"
            disabled={!valid}
            onClick={() => {
              onLog({ deedKey: deed.key, day, quantity: unit ? qtyNum : 1, doneBy });
              close();
            }}
          >
            {t('task.logIt')}
          </Button>
        ) : undefined
      }
    >
      {!deed ? (
        <>
          <TextField
            label={t('fix.search')}
            placeholder={t('fix.searchPlaceholder')}
            value={query}
            data-autofocus
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="mt-3 flex flex-col">
            {results.map((d) => (
              <li key={d.key}>
                <button
                  type="button"
                  onClick={() => setPicked(d.key)}
                  className="flex min-h-[52px] w-full items-center gap-3 rounded-theme px-2 text-left hover:bg-surface-2"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2">
                    <Icon name={d.glyph} size={18} />
                  </span>
                  <span className="flex-1 font-bold">{d.name}</span>
                  <Icon name="chevron" size={18} className="text-ink-muted" />
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="p-2 text-ink-muted">{t('fix.none')}</li>}
          </ul>
        </>
      ) : (
        <div className="flex flex-col gap-5">
          <fieldset>
            <legend className="mb-2 text-sm font-bold">{t('task.doneWhen')}</legend>
            <div className="flex flex-wrap gap-2">
              {days.map((d, i) => (
                <Chip key={d} selected={day === d} onClick={() => setDay(d)}>
                  {dayLabel(i)}
                </Chip>
              ))}
            </div>
          </fieldset>
          {active.length > 1 && (
            <fieldset>
              <legend className="mb-2 text-sm font-bold">{t('task.doneBy')}</legend>
              <div className="flex flex-wrap gap-2">
                {active.map((m) => (
                  <Chip
                    key={m.id}
                    selected={doneBy === m.id}
                    onClick={() => setDoneBy(m.id)}
                    leading={
                      <Avatar
                        avatar={m.avatar}
                        color={m.color}
                        name={m.display_name}
                        size={24}
                        decorative
                      />
                    }
                  >
                    {m.id === me.id ? t('common.you') : m.display_name}
                  </Chip>
                ))}
              </div>
            </fieldset>
          )}
          {unit && (
            <TextField
              label={t('task.quantity', { unit })}
              type="number"
              inputMode="decimal"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          )}
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="self-start text-sm font-bold underline underline-offset-2"
          >
            {t('common.back')}
          </button>
        </div>
      )}
    </Sheet>
  );
}
