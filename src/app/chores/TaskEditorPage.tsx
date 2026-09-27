import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  EmptyState,
  PageHeader,
  Segmented,
  Select,
  Splash,
  TextArea,
  TextField,
} from '@/components/ui';
import { ScheduleEditor } from '@/modules/chores/components/ScheduleEditor';
import { useChores, useTaskMutations } from '@/modules/chores/hooks';
import type { IfMissed, Priority, Schedule } from '@/modules/chores/logic';
import { describeSchedule } from '@/modules/chores/schedule';
import type { TaskInput } from '@/modules/chores/types';
import { useHousehold } from '@/modules/households/context';
import { buildTree } from '@/modules/locations/logic';
import { DEEDS } from '@/modules/rewards/deeds';
import { EffortIcon, useCopy } from '@/theme';
import { Tip } from '../help/Tip';

const EMPTY: TaskInput = {
  title: '',
  notes: null,
  location_id: null,
  effort: 1,
  priority: 'normal',
  schedule: { type: 'weekly_on', days: [6] },
  if_missed: 'let_go',
  assignee_id: null,
  deed_key: null,
  unit: null,
};

export function TaskEditorPage() {
  const t = useCopy();
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id;
  const { members, today } = useHousehold();
  const { tasks, locations, isLoading } = useChores();
  const { create, update, archive } = useTaskMutations();
  const existing = tasks.find((x) => x.id === id);
  const [form, setForm] = useState<TaskInput>({ ...EMPTY, start_on: today });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        notes: existing.notes,
        location_id: existing.location_id,
        effort: existing.effort,
        priority: existing.priority,
        schedule: existing.schedule,
        if_missed: existing.if_missed,
        assignee_id: existing.assignee_id,
        deed_key: existing.deed_key,
        unit: existing.unit,
      });
    }
  }, [existing]);

  const tree = useMemo(() => buildTree(locations), [locations]);
  const set = <K extends keyof TaskInput>(key: K, value: TaskInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  if (isLoading) return <Splash />;
  if (!isNew && !existing) return <EmptyState icon="sparkle" title={t('common.error')} />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setError(null);
    try {
      if (isNew) await create.mutateAsync([form]);
      else await update.mutateAsync({ id: id!, input: form });
      navigate(-1);
    } catch {
      setError(t('common.error'));
    }
  };

  const locationOptions = tree.flatMap((node) => {
    const rows: Array<{ id: string; label: string }> = [];
    const walk = (n: (typeof tree)[number], depth: number) => {
      if (n.location.kind !== 'zone')
        rows.push({ id: n.location.id, label: `${'  '.repeat(depth)}${n.location.name}` });
      n.children.forEach((c) => walk(c, n.location.kind === 'zone' ? depth : depth + 1));
    };
    walk(node, 0);
    return node.location.kind === 'zone'
      ? [{ id: `zone:${node.location.id}`, label: node.location.name, group: true }, ...rows]
      : rows;
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 pb-8">
      <PageHeader title={isNew ? t('task.new') : t('task.editTitle')} back />
      <TextField
        label={t('task.title')}
        value={form.title}
        maxLength={80}
        required
        onChange={(e) => set('title', e.target.value)}
        autoFocus={isNew}
      />

      <Select
        label={t('task.location')}
        value={form.location_id ?? ''}
        onChange={(e) => set('location_id', e.target.value || null)}
      >
        <option value="">{t('task.noLocation')}</option>
        {locationOptions.map((o) =>
          'group' in o ? (
            <option key={o.id} disabled>
              {o.label}
            </option>
          ) : (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ),
        )}
      </Select>

      <div>
        <ScheduleEditor value={form.schedule} onChange={(s: Schedule) => set('schedule', s)} />
        <p className="mt-2 px-0.5 text-sm text-ink-muted">{describeSchedule(form.schedule, t)}</p>
      </div>

      {isNew && (
        <TextField
          label={t('task.startOn')}
          type="date"
          value={form.start_on ?? today}
          onChange={(e) => set('start_on', e.target.value || today)}
        />
      )}

      <Tip id="editor.ifMissed" text="tip.editor.ifMissed" />
      <Segmented<IfMissed>
        label={t('task.ifMissed')}
        value={form.if_missed}
        onChange={(v) => set('if_missed', v)}
        options={[
          { value: 'carry', label: t('task.ifMissed.carry') },
          { value: 'let_go', label: t('task.ifMissed.let_go') },
        ]}
      />

      <fieldset>
        <legend className="mb-1.5 px-0.5 text-sm font-bold">{t('task.effort')}</legend>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={form.effort === level}
              onClick={() => set('effort', level)}
              className={`grid min-h-[48px] flex-1 place-items-center rounded-theme ${form.effort === level ? 'bg-primary/15 shadow-[inset_0_0_0_2.5px_var(--primary)]' : 'bg-surface shadow-[inset_0_0_0_2px_var(--line)]'}`}
            >
              <EffortIcon level={level} />
            </button>
          ))}
        </div>
      </fieldset>

      <Segmented<Priority>
        label={t('task.priority')}
        value={form.priority}
        onChange={(v) => set('priority', v)}
        options={[
          { value: 'low', label: t('task.priority.low') },
          { value: 'normal', label: t('task.priority.normal') },
          { value: 'high', label: t('task.priority.high') },
        ]}
      />

      <Select
        label={t('task.assignee')}
        value={form.assignee_id ?? ''}
        onChange={(e) => set('assignee_id', e.target.value || null)}
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

      <TextField
        label={t('task.unit')}
        placeholder={t('task.unitPlaceholder')}
        maxLength={24}
        value={form.unit ?? ''}
        onChange={(e) => set('unit', e.target.value || null)}
      />

      <Select
        label={t('task.deed')}
        value={form.deed_key ?? ''}
        onChange={(e) => set('deed_key', e.target.value || null)}
      >
        <option value="">{t('task.noDeed')}</option>
        {DEEDS.map((d) => (
          <option key={d.key} value={d.key}>
            {d.name}
          </option>
        ))}
      </Select>

      <TextArea
        label={t('task.notes')}
        maxLength={2000}
        value={form.notes ?? ''}
        onChange={(e) => set('notes', e.target.value || null)}
      />

      {error && (
        <p role="alert" className="font-bold">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        block
        loading={create.isPending || update.isPending}
        disabled={!form.title.trim()}
      >
        {t('common.save')}
      </Button>
      {!isNew && (
        <Button
          variant="ghost"
          icon="archive"
          onClick={async () => {
            await archive(id!);
            navigate('/');
          }}
        >
          {t('task.archive')}
        </Button>
      )}
    </form>
  );
}
