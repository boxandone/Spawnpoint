import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Chip,
  Icon,
  PageHeader,
  Segmented,
  Select,
  Splash,
  Switch,
  TextArea,
  TextField,
  useToast,
} from '@/components/ui';
import { parseLinks, parsePrice } from '@/modules/lists/logic';
import type { Plan, PlanInput } from '@/modules/plans/api';
import { usePlanMutations, usePlans } from '@/modules/plans/hooks';
import { PLAN_COLORS, PLAN_STATUSES, PLAN_TYPES, type PlanType } from '@/modules/plans/logic';
import { useCopy, type CopyKey } from '@/theme';
import { MEMBER_INK, memberColor } from '@/theme/memberColors';
import { PLAN_ICONS, planIcon } from './planMeta';

/** New or edit plan. Only the title is required. */
export function PlanEditorPage() {
  const { id } = useParams();
  const plans = usePlans();
  if (plans.isLoading) return <Splash />;
  const existing = id ? plans.data?.find((p) => p.id === id) : undefined;
  if (id && !existing) return <Splash />;
  return <Editor key={id ?? 'new'} existing={existing} />;
}

function Editor({ existing }: { existing?: Plan }) {
  const t = useCopy();
  const navigate = useNavigate();
  const toast = useToast();
  const { create, update } = usePlanMutations();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [type, setType] = useState<PlanType>((existing?.type as PlanType) ?? 'trip');
  const [status, setStatus] = useState(existing?.status ?? 'someday');
  const [startsOn, setStartsOn] = useState(existing?.starts_on ?? '');
  const [endsOn, setEndsOn] = useState(existing?.ends_on ?? '');
  const [tentative, setTentative] = useState(existing?.tentative ?? false);
  const [icon, setIcon] = useState(existing ? planIcon(existing) : '');
  const [color, setColor] = useState(existing?.color ?? 'sky');
  const [budget, setBudget] = useState(existing?.budget == null ? '' : String(existing.budget));
  const [links, setLinks] = useState((existing?.links ?? []).join('\n'));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [discuss, setDiscuss] = useState(existing?.discuss ?? false);
  const [busy, setBusy] = useState(false);
  const parsedLinks = parseLinks(links);
  const linksError = parsedLinks.invalid.length > 0 ? t('toBuy.linksInvalid') : undefined;
  const datesError =
    endsOn && (!startsOn || endsOn < startsOn) ? t('plans.datesInvalid') : undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || linksError || datesError) return;
    setBusy(true);
    const input: PlanInput = {
      title: title.trim(),
      type,
      status,
      starts_on: startsOn || null,
      ends_on: endsOn || null,
      tentative: !!startsOn && tentative,
      icon: icon || null,
      color,
      budget: parsePrice(budget),
      links: parsedLinks.links,
      notes: notes.trim() || null,
      discuss,
    };
    try {
      if (existing) {
        await update(existing.id, input);
        navigate(`/plans/${existing.id}`, { replace: true });
      } else {
        const plan = await create(input);
        navigate(`/plans/${plan.id}`, { replace: true });
      }
    } catch {
      toast.show({ message: t('common.error'), tone: 'danger' });
      setBusy(false);
    }
  };

  return (
    <div className="pb-8">
      <PageHeader title={existing ? t('plans.edit') : t('plans.new')} back />
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <TextField
          label={t('plans.titleLabel')}
          placeholder={t('plans.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
          autoFocus={!existing}
        />
        <Segmented
          label={t('plans.type')}
          value={type}
          onChange={setType}
          options={PLAN_TYPES.map((v) => ({ value: v, label: t(`plans.type.${v}` as CopyKey) }))}
        />
        <Select
          label={t('stuff.statusLabel')}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {PLAN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`plans.status.${s}` as CopyKey)}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label={t('plans.starts')}
            type="date"
            value={startsOn}
            onChange={(e) => setStartsOn(e.target.value)}
          />
          <TextField
            label={t('plans.ends')}
            type="date"
            value={endsOn}
            min={startsOn || undefined}
            onChange={(e) => setEndsOn(e.target.value)}
            error={datesError}
          />
        </div>
        {startsOn && (
          <Switch
            label={t('plans.tentative')}
            description={t('plans.tentativeHint')}
            checked={tentative}
            onChange={setTentative}
          />
        )}
        <fieldset>
          <legend className="mb-1.5 px-0.5 text-sm font-bold">{t('lists.icon')}</legend>
          <div className="flex flex-wrap gap-2">
            {PLAN_ICONS.map((i, n) => (
              <Chip
                key={i}
                selected={icon === i}
                onClick={() => setIcon(i)}
                aria-label={t('lists.iconOption', { n: n + 1 })}
                className="w-12 justify-center px-0"
              >
                <Icon name={i} size={20} />
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 px-0.5 text-sm font-bold">{t('plans.color')}</legend>
          <div className="flex flex-wrap gap-2">
            {PLAN_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={color === c}
                aria-label={t(`color.${c}` as CopyKey)}
                onClick={() => setColor(c)}
                className={`grid h-11 w-11 place-items-center rounded-full ${color === c ? 'ring-4 ring-primary' : ''}`}
                style={{ background: memberColor(c), color: MEMBER_INK }}
              >
                {color === c && <Icon name="check" size={18} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </fieldset>
        <TextField
          label={t('plans.budget')}
          hint={t('common.optional')}
          inputMode="decimal"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          maxLength={14}
        />
        <TextArea
          label={t('toBuy.links')}
          hint={linksError ?? t('toBuy.linksHint')}
          value={links}
          onChange={(e) => setLinks(e.target.value)}
          rows={2}
          inputMode="url"
        />
        <TextArea
          label={t('lists.notes')}
          hint={t('plans.notesHint')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          maxLength={20000}
        />
        <Switch
          label={t('todo.discuss')}
          description={t('todo.discussHint')}
          checked={discuss}
          onChange={setDiscuss}
        />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" block loading={busy} disabled={!title.trim()}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
