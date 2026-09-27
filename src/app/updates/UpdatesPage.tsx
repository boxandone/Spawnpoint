import { useEffect } from 'react';
import { PageHeader, Panel, Tag } from '@/components/ui';
import { useCopy } from '@/theme';
import { APP_VERSION, RELEASES, type ChangeKind } from './releases';
import { useUnseenUpdate } from './useUpdates';

const TONE: Record<ChangeKind, 'success' | 'secondary' | 'neutral'> = {
  new: 'success',
  improved: 'secondary',
  fixed: 'neutral',
};

/** Patch notes: what changed in each version of the app. */
export function UpdatesPage() {
  const t = useCopy();
  const { markSeen } = useUnseenUpdate();
  useEffect(() => markSeen(), [markSeen]);

  return (
    <div className="pb-6">
      <PageHeader
        title={t('updates.title')}
        subtitle={t('updates.version', { version: APP_VERSION })}
        back
      />
      <ol className="flex flex-col gap-4">
        {RELEASES.map((r) => (
          <li key={r.version}>
            <Panel>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg leading-tight">{r.title}</h2>
                <span className="shrink-0 font-num text-sm text-ink-muted">v{r.version}</span>
              </div>
              <p className="text-sm text-ink-muted">{r.date}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {r.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Tag tone={TONE[c.kind]} className="mt-0.5 shrink-0">
                      {t(`updates.kind.${c.kind}` as 'updates.kind.new')}
                    </Tag>
                    <span>{c.text}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </li>
        ))}
      </ol>
    </div>
  );
}
