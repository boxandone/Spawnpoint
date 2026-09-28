import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  Markdown,
  PageHeader,
  Panel,
  SectionTitle,
  Splash,
  Switch,
  Tag,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { mediumDate } from '@/lib/dates';
import { useHousehold } from '@/modules/households/context';
import { linkLabel } from '@/modules/lists/logic';
import {
  useChecklist,
  useChecklistMutations,
  useDiscussions,
  usePlanMutations,
  usePlans,
} from '@/modules/plans/hooks';
import { PLAN_STATUSES } from '@/modules/plans/logic';
import { DocumentList } from '@/modules/stuff/components/DocumentList';
import { useDocuments } from '@/modules/stuff/hooks';
import { useCopy, type CopyKey } from '@/theme';
import { MEMBER_INK } from '@/theme/memberColors';
import { countdownLabel, dateLabel } from './PlanCard';
import { planColor, planIcon } from './planMeta';

/** One plan: status, dates, checklist, notes, links, files, and past decisions. */
export function PlanPage() {
  const t = useCopy();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { today, memberById } = useHousehold();
  const plans = usePlans();
  const checklist = useChecklist();
  const discussions = useDiscussions();
  const docs = useDocuments();
  const { update, archive } = usePlanMutations();
  const items = useChecklistMutations();
  const [newItem, setNewItem] = useState('');
  const plan = plans.data?.find((p) => p.id === id);
  const list = useMemo(
    () =>
      (checklist.data ?? [])
        .filter((c) => c.plan_id === id)
        .sort((a, b) => a.position - b.position),
    [checklist.data, id],
  );
  const planDocs = useMemo(
    () => (docs.data ?? []).filter((d) => d.plan_id === id),
    [docs.data, id],
  );
  const decisions = (discussions.data ?? []).filter((d) => d.plan_id === id);

  if (plans.isLoading) return <Splash />;
  if (!plan) {
    return (
      <div>
        <PageHeader title={t('plans.name')} back="/plans" />
        <EmptyState icon="plans" title={t('plans.notFound')} />
      </div>
    );
  }

  const when = dateLabel(plan, today);
  const soon = countdownLabel(plan, today, t);
  const addItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    const pos = list.length ? Math.max(...list.map((i) => i.position)) + 1 : 0;
    items.add(plan.id, newItem.trim(), pos);
    setNewItem('');
  };

  return (
    <div className="pb-8">
      <PageHeader
        title={plan.title}
        back="/plans"
        action={
          <IconButton
            icon="edit"
            label={t('plans.edit')}
            onClick={() => navigate(`/plans/${plan.id}/edit`)}
          />
        }
      />

      <Panel className="mb-3 flex items-center gap-3">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-theme"
          style={{ background: planColor(plan), color: MEMBER_INK }}
        >
          <Icon name={planIcon(plan)} size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-muted">{t(`plans.type.${plan.type}` as CopyKey)}</p>
          {when ? (
            <p className="font-bold">
              {when}
              {plan.tentative && (
                <span className="font-normal text-ink-muted"> · {t('plans.tentativeShort')}</span>
              )}
            </p>
          ) : (
            <p className="text-ink-muted">{t('plans.noDate')}</p>
          )}
          {plan.budget != null && (
            <p className="text-sm text-ink-muted">
              {t('plans.budgetShort', {
                amount: plan.budget.toLocaleString(undefined, { maximumFractionDigits: 2 }),
              })}
            </p>
          )}
        </div>
        {soon && <Tag tone="accent">{soon}</Tag>}
      </Panel>

      {plan.archived_at && (
        <Panel className="mb-3 flex items-center justify-between gap-2">
          <span className="text-sm">{t('plans.isArchived')}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void update(plan.id, { archived_at: null })}
          >
            {t('stuff.restore')}
          </Button>
        </Panel>
      )}

      <fieldset className="mb-3">
        <legend className="mb-1.5 px-0.5 text-sm font-bold">{t('stuff.statusLabel')}</legend>
        <div className="flex flex-wrap gap-2">
          {PLAN_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={plan.status === s}
              onClick={(e) => void update(plan.id, { status: s }, { from: e.currentTarget })}
              className={cn(
                'inline-flex min-h-[40px] items-center rounded-full px-3.5 text-sm font-semibold',
                plan.status === s
                  ? 'bg-primary text-primary-ink shadow-press'
                  : 'bg-surface text-ink shadow-[inset_0_0_0_2px_var(--line)]',
              )}
            >
              {t(`plans.status.${s}` as CopyKey)}
            </button>
          ))}
        </div>
      </fieldset>

      <Panel>
        <Switch
          label={t('todo.discuss')}
          description={t('todo.discussHint')}
          checked={plan.discuss}
          onChange={(v) => void update(plan.id, { discuss: v })}
        />
      </Panel>

      <SectionTitle>
        {t('plans.checklist')}
        {list.length > 0 && ` · ${list.filter((i) => i.done).length}/${list.length}`}
      </SectionTitle>
      <Panel className="flex flex-col gap-1">
        {list.length > 0 && (
          <ul className="flex flex-col">
            {list.map((item) => (
              <li key={item.id} className="flex min-h-[48px] items-center gap-2">
                <button
                  type="button"
                  aria-pressed={item.done}
                  aria-label={
                    item.done
                      ? t('lists.uncheck', { name: item.text })
                      : t('lists.check', { name: item.text })
                  }
                  onClick={() => items.toggle(item)}
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-full',
                    item.done
                      ? 'bg-success text-on-success'
                      : 'shadow-[inset_0_0_0_2px_var(--primary)]',
                  )}
                >
                  {item.done && <Icon name="check" size={16} strokeWidth={3} />}
                </button>
                <span className={cn('flex-1', item.done && 'text-ink-muted line-through')}>
                  {item.text}
                </span>
                <IconButton
                  icon="close"
                  label={t('common.delete') + ' ' + item.text}
                  onClick={() => items.remove(item)}
                  className="text-ink-muted"
                />
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addItem} className="flex gap-2">
          <label htmlFor="checklist-add" className="sr-only">
            {t('plans.checklistAdd')}
          </label>
          <input
            id="checklist-add"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={t('plans.checklistAdd')}
            maxLength={200}
            className="sp-input min-h-[48px] flex-1"
          />
          <button
            type="submit"
            aria-label={t('plans.checklistAdd')}
            className="sp-btn sp-btn-secondary grid min-h-[48px] w-12 place-items-center px-0"
          >
            <Icon name="plus" size={20} strokeWidth={2.5} />
          </button>
        </form>
      </Panel>

      {plan.notes && (
        <>
          <SectionTitle>{t('lists.notes')}</SectionTitle>
          <Panel>
            <Markdown text={plan.notes} />
          </Panel>
        </>
      )}

      {plan.links.length > 0 && (
        <>
          <SectionTitle>{t('toBuy.links')}</SectionTitle>
          <Panel>
            <ul className="flex flex-col">
              {plan.links.map((l) => (
                <li key={l}>
                  <a
                    href={l}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex min-h-[44px] items-center gap-2 font-bold underline underline-offset-2"
                  >
                    <Icon name="link" size={18} />
                    {linkLabel(l)}
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}

      <SectionTitle>{t('docs.section')}</SectionTitle>
      <DocumentList docs={planDocs} itemId={null} planId={plan.id} />

      {decisions.length > 0 && (
        <>
          <SectionTitle>{t('talk.decisions')}</SectionTitle>
          <ul className="flex flex-col gap-2">
            {decisions.map((d) => (
              <li key={d.id} className="sp-panel p-3">
                <p className="text-[13px] text-ink-muted">
                  {mediumDate(d.created_at.slice(0, 10), today)} ·{' '}
                  {memberById(d.resolved_by)?.display_name}
                </p>
                <p className="mt-1">{d.note ?? t('talk.noNote')}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {!plan.archived_at && (
        <Button
          variant="ghost"
          icon="archive"
          className="mt-6"
          onClick={() => {
            void archive(plan);
            navigate('/plans');
          }}
        >
          {t('plans.archive')}
        </Button>
      )}
    </div>
  );
}
