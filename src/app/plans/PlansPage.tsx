import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  EmptyState,
  Icon,
  PageHeader,
  SectionTitle,
  Segmented,
  Splash,
  Tag,
} from '@/components/ui';
import { useHousehold } from '@/modules/households/context';
import { useListItems } from '@/modules/lists/hooks';
import { useChecklist, usePlans } from '@/modules/plans/hooks';
import { board, checklistProgress, timeline } from '@/modules/plans/logic';
import { useCopy, type CopyKey } from '@/theme';
import { Tip } from '../help/Tip';
import { PlanCard } from './PlanCard';

type View = 'board' | 'timeline';
const VIEW_KEY = 'sp.plans.view';

/** Plans: a board by status and a timeline with countdowns. */
export function PlansPage() {
  const t = useCopy();
  const navigate = useNavigate();
  const { today } = useHousehold();
  const plans = usePlans();
  const checklist = useChecklist();
  const listItems = useListItems();
  const [view, setViewState] = useState<View>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'timeline' ? 'timeline' : 'board';
    } catch {
      return 'board';
    }
  });
  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* per-device only */
    }
  };

  const all = useMemo(() => plans.data ?? [], [plans.data]);
  const progress = useMemo(() => {
    const m = new Map<string, { done: number; total: number }>();
    const by = new Map<string, Array<{ done: boolean }>>();
    for (const c of checklist.data ?? []) by.set(c.plan_id, [...(by.get(c.plan_id) ?? []), c]);
    for (const [id, items] of by) m.set(id, checklistProgress(items));
    return m;
  }, [checklist.data]);
  const queue =
    all.filter((p) => p.discuss && !p.archived_at).length +
    (listItems.data ?? []).filter((i) => i.discuss && !i.checked).length;

  if (plans.isLoading) return <Splash />;
  const cols = board(all);
  const { dated, undated } = timeline(all, today);
  const live = all.filter((p) => !p.archived_at);

  return (
    <div className="pb-24">
      <PageHeader
        title={t('plans.name')}
        action={
          <Button size="sm" icon="plus" onClick={() => navigate('/plans/new')}>
            {t('plans.new')}
          </Button>
        }
      />
      <Link to="/talk" className="sp-panel mb-3 flex min-h-[56px] items-center gap-3 p-3">
        <span className="grid h-10 w-10 place-items-center rounded-theme-sm bg-surface-2">
          <Icon name="chat" size={20} />
        </span>
        <span className="flex-1 font-bold">{t('talk.title')}</span>
        {queue > 0 && <Tag tone="accent">{t('talk.count', { count: queue })}</Tag>}
        <Icon name="chevron" size={18} className="text-ink-muted" />
      </Link>

      {live.length === 0 ? (
        <>
          <Tip id="plans.start" text="tip.plans.start" className="mb-3" />
          <EmptyState
            icon="plans"
            title={t('plans.empty')}
            body={t('plans.emptyBody')}
            action={
              <Button icon="plus" onClick={() => navigate('/plans/new')}>
                {t('plans.new')}
              </Button>
            }
          />
        </>
      ) : (
        <>
          <Segmented
            label={t('plans.view')}
            value={view}
            onChange={setView}
            options={[
              { value: 'board', label: t('plans.board') },
              { value: 'timeline', label: t('plans.timeline') },
            ]}
            className="mb-2"
          />
          {view === 'board' ? (
            cols
              .filter((c) => c.plans.length > 0)
              .map((c) => (
                <section key={c.status}>
                  <SectionTitle>
                    {t(`plans.status.${c.status}` as CopyKey)} · {c.plans.length}
                  </SectionTitle>
                  <ul className="flex flex-col gap-2">
                    {c.plans.map((p) => (
                      <PlanCard key={p.id} plan={p} today={today} progress={progress.get(p.id)} />
                    ))}
                  </ul>
                </section>
              ))
          ) : (
            <>
              {dated.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2">
                  {dated.map((p) => (
                    <PlanCard
                      key={p.id}
                      plan={p}
                      today={today}
                      progress={progress.get(p.id)}
                      showStatus
                    />
                  ))}
                </ul>
              )}
              {undated.length > 0 && (
                <>
                  <SectionTitle>{t('plans.noDate')}</SectionTitle>
                  <ul className="flex flex-col gap-2">
                    {undated.map((p) => (
                      <PlanCard
                        key={p.id}
                        plan={p}
                        today={today}
                        progress={progress.get(p.id)}
                        showStatus
                      />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
