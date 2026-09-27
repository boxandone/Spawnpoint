import { Chip, Segmented, Select, TextField } from '@/components/ui';
import { monthName, ordinal, weekdayName } from '@/lib/dates';
import { useCopy } from '@/theme';
import type { Nth, Schedule, Weekday } from '../logic';

type Kind = Schedule['type'];

const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

function defaultFor(kind: Kind): Schedule {
  switch (kind) {
    case 'daily':
      return { type: 'daily' };
    case 'every_n_days':
      return { type: 'every_n_days', n: 7 };
    case 'weekly_on':
      return { type: 'weekly_on', days: [6] };
    case 'monthly_on':
      return { type: 'monthly_on', nth: 1, weekday: 6 };
    case 'yearly_in':
      return { type: 'yearly_in', months: [4, 10] };
  }
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/** Builds any schedule type. Invalid states (no days picked) are prevented. */
export function ScheduleEditor({
  value,
  onChange,
}: {
  value: Schedule;
  onChange: (s: Schedule) => void;
}) {
  const t = useCopy();
  const kinds: Kind[] = ['daily', 'every_n_days', 'weekly_on', 'monthly_on', 'yearly_in'];

  return (
    <div className="flex flex-col gap-3">
      <fieldset>
        <legend className="mb-2 px-0.5 text-sm font-bold">{t('task.schedule')}</legend>
        <div className="flex flex-wrap gap-2">
          {kinds.map((k) => (
            <Chip
              key={k}
              selected={value.type === k}
              onClick={() => value.type !== k && onChange(defaultFor(k))}
            >
              {t(`schedule.type.${k}` as 'schedule.type.daily')}
            </Chip>
          ))}
        </div>
      </fieldset>

      {value.type === 'every_n_days' && (
        <TextField
          label={t('schedule.every_n_days', { n: 'N' })}
          hint={t('schedule.floatingHint')}
          type="number"
          inputMode="numeric"
          min={1}
          max={365}
          value={value.n}
          onChange={(e) => {
            const n = Math.round(Number(e.target.value));
            if (n >= 1 && n <= 365) onChange({ type: 'every_n_days', n });
          }}
        />
      )}

      {value.type === 'weekly_on' && (
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label={t('schedule.type.weekly_on')}
        >
          {WEEK_ORDER.map((d) => (
            <Chip
              key={d}
              selected={value.days.includes(d)}
              onClick={() => {
                const days = toggle(value.days, d);
                if (days.length > 0) onChange({ type: 'weekly_on', days: days.sort() });
              }}
              className="min-w-[48px] justify-center px-2"
            >
              {weekdayName(d)}
            </Chip>
          ))}
        </div>
      )}

      {value.type === 'monthly_on' && (
        <>
          <Segmented
            label={t('schedule.type.monthly_on')}
            value={'day' in value ? 'day' : 'nth'}
            options={[
              { value: 'nth', label: t('schedule.byWeekday') },
              { value: 'day', label: t('schedule.byDay') },
            ]}
            onChange={(v) =>
              onChange(
                v === 'day'
                  ? { type: 'monthly_on', day: 1 }
                  : { type: 'monthly_on', nth: 1, weekday: 6 },
              )
            }
          />
          {'day' in value ? (
            <Select
              label={t('schedule.byDay')}
              value={value.day}
              onChange={(e) => onChange({ type: 'monthly_on', day: Number(e.target.value) })}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {ordinal(d)}
                </option>
              ))}
            </Select>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t('schedule.byWeekday')}
                value={value.nth}
                onChange={(e) => onChange({ ...value, nth: Number(e.target.value) as Nth })}
              >
                {([1, 2, 3, 4, -1] as Nth[]).map((n) => (
                  <option key={n} value={n}>
                    {t(`schedule.nth.${n}` as 'schedule.nth.1')}
                  </option>
                ))}
              </Select>
              <Select
                label={t('schedule.type.weekly_on')}
                value={value.weekday}
                onChange={(e) => onChange({ ...value, weekday: Number(e.target.value) as Weekday })}
              >
                {WEEK_ORDER.map((d) => (
                  <option key={d} value={d}>
                    {weekdayName(d, true)}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </>
      )}

      {value.type === 'yearly_in' && (
        <div
          className="grid grid-cols-4 gap-1.5"
          role="group"
          aria-label={t('schedule.type.yearly_in')}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <Chip
              key={m}
              selected={value.months.includes(m)}
              onClick={() => {
                const months = toggle(value.months, m);
                if (months.length > 0)
                  onChange({ type: 'yearly_in', months: months.sort((a, b) => a - b) });
              }}
              className="justify-center px-1"
            >
              {monthName(m)}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
