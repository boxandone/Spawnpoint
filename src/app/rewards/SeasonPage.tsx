import { Icon, PageHeader, Panel, ProgressRing, Splash } from '@/components/ui';
import { useMyRewards } from '@/modules/rewards/hooks';
import { useCopy, type CopyKey } from '@/theme';

/** This season's 10 goals. Finish 5 for the season badge. Private to you. */
export function SeasonPage() {
  const t = useCopy();
  const { data: r } = useMyRewards();
  if (!r) return <Splash />;
  const quarter = r.season.key.split('-')[1] as 'Q1' | 'Q2' | 'Q3' | 'Q4';
  const title = t('season.title', { season: t(`season.${quarter}` as CopyKey) });

  return (
    <div className="pb-8">
      <PageHeader title={title} back="/me" />
      <Panel className="flex items-center gap-4">
        <ProgressRing
          value={r.season.done}
          max={10}
          size={84}
          stroke={9}
          tone={r.season.done >= 5 ? 'success' : 'secondary'}
          label={title}
          valueText={t('season.body', { done: r.season.done })}
        >
          <span className="font-num text-xl font-bold">{r.season.done}/10</span>
        </ProgressRing>
        <p className="text-sm">
          {r.season.done >= 5 ? t('season.earned') : t('season.body', { done: r.season.done })}
        </p>
      </Panel>
      <ul className="mt-4 flex flex-col gap-2">
        {r.season.goals.map((g) => {
          const done = g.progress >= g.target;
          return (
            <li key={g.key} className="sp-panel flex min-h-[56px] items-center gap-3 p-3">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? 'bg-success text-on-success' : 'shadow-[inset_0_0_0_2px_var(--line)]'}`}
                aria-hidden
              >
                {done && <Icon name="check" size={16} strokeWidth={3} />}
              </span>
              <span className={`flex-1 ${done ? 'font-bold' : ''}`}>
                {t(`goal.${g.key}` as CopyKey)}
              </span>
              <span className="font-num text-sm text-ink-muted">
                {Math.min(Math.floor(g.progress), g.target).toLocaleString()}/
                {g.target.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
