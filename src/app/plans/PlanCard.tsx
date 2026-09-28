import { Link } from 'react-router-dom';
import { Icon, Tag } from '@/components/ui';
import { mediumDate, type IsoDate } from '@/lib/dates';
import type { Plan } from '@/modules/plans/api';
import { countdown } from '@/modules/plans/logic';
import { useCopy, type CopyKey, type Translate } from '@/theme';
import { MEMBER_INK } from '@/theme/memberColors';
import { planColor, planIcon } from './planMeta';

export function countdownLabel(plan: Plan, today: IsoDate, t: Translate): string | null {
  const c = countdown(plan, today);
  if (!c) return null;
  if (c.kind === 'soon') return t('plans.inDays', { count: c.days });
  if (c.kind === 'today') return t('plans.today');
  if (c.kind === 'now') return t('plans.now');
  return t('plans.ago', { count: c.days });
}

export function dateLabel(plan: Plan, today: IsoDate): string | null {
  if (!plan.starts_on) return null;
  const start = mediumDate(plan.starts_on, today);
  return plan.ends_on && plan.ends_on !== plan.starts_on
    ? `${start} – ${mediumDate(plan.ends_on, today)}`
    : start;
}

/** A plan on the board or timeline: icon, title, dates, countdown, checklist. */
export function PlanCard({
  plan,
  today,
  progress,
  showStatus,
}: {
  plan: Plan;
  today: IsoDate;
  progress?: { done: number; total: number };
  showStatus?: boolean;
}) {
  const t = useCopy();
  const when = dateLabel(plan, today);
  const soon = countdownLabel(plan, today, t);
  return (
    <li>
      <Link to={`/plans/${plan.id}`} className="sp-panel flex min-h-[64px] items-center gap-3 p-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-theme-sm"
          style={{ background: planColor(plan), color: MEMBER_INK }}
        >
          <Icon name={planIcon(plan)} size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{plan.title}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
            {showStatus && <Tag>{t(`plans.status.${plan.status}` as CopyKey)}</Tag>}
            {when && (
              <span>
                {when}
                {plan.tentative ? ` · ${t('plans.tentativeShort')}` : ''}
              </span>
            )}
            {soon && <Tag tone="accent">{soon}</Tag>}
            {plan.discuss && <Tag tone="secondary">{t('todo.discussTag')}</Tag>}
            {progress && progress.total > 0 && (
              <span className="font-num">
                <Icon name="check" size={12} strokeWidth={3} className="inline" /> {progress.done}/
                {progress.total}
              </span>
            )}
          </span>
        </span>
        <Icon name="chevron" size={18} className="text-ink-muted" />
      </Link>
    </li>
  );
}
