import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Button, Chip, Icon, Sheet, TextField } from '@/components/ui';
import { mediumDate, type IsoDate } from '@/lib/dates';
import type { Member } from '@/modules/households/types';
import { useCopy } from '@/theme';
import { backdateBounds, backdateChoices, validateDoneOn } from '../logic';
import type { ChoreTask, LogInput } from '../types';

interface Props {
  task: ChoreTask | null;
  onClose: () => void;
  onLog: (input: LogInput) => void;
  members: Member[];
  me: Member;
  today: IsoDate;
}

/** Long-press menu: done on another day, by someone else, with a quantity, or skip. */
export function TaskActionSheet({ task, onClose, onLog, members, me, today }: Props) {
  const t = useCopy();
  const dateId = useId();
  const [day, setDay] = useState<IsoDate>(today);
  const [picking, setPicking] = useState(false);
  const [doneBy, setDoneBy] = useState(me.id);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!task) return;
    setDay(today);
    setPicking(false);
    setDoneBy(me.id);
    setQuantity('');
    setReason('');
  }, [task, today, me.id]);

  if (!task) return null;
  const bounds = backdateBounds(task, today);
  const choices = backdateChoices(task, today);
  const active = members.filter((m) => m.status === 'active');
  const qty = quantity.trim() === '' ? null : Number(quantity);
  const qtyValid = qty === null || (Number.isFinite(qty) && qty > 0 && qty <= 100000);
  const dayValid = validateDoneOn(task, day, today) === 'ok';
  const dayLabel = (d: { daysAgo: number }) =>
    d.daysAgo === 0
      ? t('day.today')
      : d.daysAgo === 1
        ? t('day.yesterday')
        : t('day.daysAgo', { count: d.daysAgo });

  const submit = (kind: 'done' | 'skipped') => {
    if (!dayValid || !qtyValid) return;
    onLog({
      taskId: task.id,
      doneOn: day,
      doneBy: kind === 'skipped' ? me.id : doneBy,
      kind,
      quantity: kind === 'done' ? qty : null,
      note: kind === 'skipped' ? reason : null,
      source: 'menu',
    });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={task.title}
      footer={
        <Button
          block
          size="lg"
          icon="check"
          onClick={() => submit('done')}
          disabled={!dayValid || !qtyValid}
          data-autofocus
        >
          {t('task.logIt')}
        </Button>
      }
    >
      <fieldset className="mt-2">
        <legend className="mb-2 text-sm font-bold">{t('task.doneWhen')}</legend>
        <div className="flex flex-wrap gap-2">
          {choices.map((c) => (
            <Chip
              key={c.date}
              selected={!picking && day === c.date}
              onClick={() => {
                setPicking(false);
                setDay(c.date);
              }}
            >
              {dayLabel(c)}
            </Chip>
          ))}
          <Chip
            selected={picking}
            onClick={() => setPicking(true)}
            leading={<Icon name="calendar" size={16} />}
          >
            {picking ? mediumDate(day, today) : t('day.pick')}
          </Chip>
        </div>
        {picking && (
          <div className="mt-3">
            <label htmlFor={dateId} className="sr-only">
              {t('day.pick')}
            </label>
            <input
              id={dateId}
              type="date"
              className="sp-input"
              min={bounds.min}
              max={bounds.max}
              value={day}
              onChange={(e) => e.target.value && setDay(e.target.value)}
            />
          </div>
        )}
      </fieldset>

      {active.length > 1 && (
        <fieldset className="mt-5">
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

      {task.unit && (
        <TextField
          className="mt-5"
          label={t('task.quantity', { unit: task.unit })}
          type="number"
          inputMode="decimal"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          error={qtyValid ? undefined : t('common.error')}
        />
      )}

      <div className="mt-6 rounded-theme bg-surface-2 p-3">
        <TextField
          label={t('task.skipReason')}
          hint={t('common.optional')}
          placeholder={t('task.skipReasonPlaceholder')}
          value={reason}
          maxLength={280}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button
          variant="secondary"
          icon="skip"
          block
          className="mt-3"
          onClick={() => submit('skipped')}
          disabled={!dayValid}
        >
          {t('task.skipConfirm')}
        </Button>
      </div>

      <Link
        to={`/tasks/${task.id}`}
        className="mt-4 inline-flex min-h-[44px] items-center px-1 font-bold underline underline-offset-2"
      >
        {t('common.edit')}
      </Link>
    </Sheet>
  );
}
