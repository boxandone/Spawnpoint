import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  EmptyState,
  Icon,
  PageHeader,
  SectionTitle,
  Sheet,
  Splash,
  TextArea,
} from '@/components/ui';
import { mediumDate } from '@/lib/dates';
import { useHousehold } from '@/modules/households/context';
import { useListItems } from '@/modules/lists/hooks';
import { useDiscussions, usePlans, useResolveDiscussion } from '@/modules/plans/hooks';
import { useCopy } from '@/theme';
import { Tip } from '../help/Tip';

interface QueueItem {
  key: string;
  title: string;
  kindLabel: string;
  to: string;
  planId?: string;
  listItemId?: string;
}

/**
 * Talk it over: everything flagged "discuss" in Plans and To-do, for a weekly
 * sit-down. Marking one discussed records a short decision.
 */
export function TalkPage() {
  const t = useCopy();
  const { today, memberById } = useHousehold();
  const plans = usePlans();
  const listItems = useListItems();
  const discussions = useDiscussions();
  const resolve = useResolveDiscussion();
  const [open, setOpen] = useState<QueueItem | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (plans.isLoading || listItems.isLoading) return <Splash />;
  const queue: QueueItem[] = [
    ...(plans.data ?? [])
      .filter((p) => p.discuss && !p.archived_at)
      .map((p) => ({
        key: p.id,
        title: p.title,
        kindLabel: t('plans.name'),
        to: `/plans/${p.id}`,
        planId: p.id,
      })),
    ...(listItems.data ?? [])
      .filter((i) => i.discuss && !i.checked)
      .map((i) => ({
        key: i.id,
        title: i.name,
        kindLabel: t('lists.todo'),
        to: `/lists/${i.list_id}`,
        listItemId: i.id,
      })),
  ];
  const past = (discussions.data ?? []).slice(0, 30);

  const save = async () => {
    if (!open) return;
    setBusy(true);
    await resolve({ planId: open.planId, listItemId: open.listItemId, note });
    setBusy(false);
    setOpen(null);
    setNote('');
  };

  return (
    <div className="pb-8">
      <PageHeader title={t('talk.title')} subtitle={t('talk.body')} back="/plans" />
      <Tip id="talk.how" text="tip.talk" className="mb-3" />
      {queue.length === 0 ? (
        <EmptyState icon="chat" title={t('talk.empty')} body={t('talk.emptyBody')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {queue.map((q) => (
            <li key={q.key} className="sp-panel flex min-h-[64px] items-center gap-3 p-3">
              <Link to={q.to} className="min-w-0 flex-1">
                <span className="block truncate font-bold">{q.title}</span>
                <span className="block text-[13px] text-ink-muted">{q.kindLabel}</span>
              </Link>
              <Button size="sm" icon="check" onClick={() => setOpen(q)}>
                {t('talk.discussed')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <>
          <SectionTitle>{t('talk.decisions')}</SectionTitle>
          <ul className="flex flex-col gap-2">
            {past.map((d) => (
              <li key={d.id} className="sp-panel p-3">
                <p className="flex items-center gap-2 font-bold">
                  <Icon name="chat" size={16} className="shrink-0 text-ink-muted" />
                  <span className="truncate">{d.title}</span>
                </p>
                <p className="mt-1">{d.note ?? t('talk.noNote')}</p>
                <p className="mt-1 text-[13px] text-ink-muted">
                  {mediumDate(d.created_at.slice(0, 10), today)} ·{' '}
                  {memberById(d.resolved_by)?.display_name}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <Sheet
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.title ?? ''}
        description={t('talk.noteBody')}
        footer={
          <Button block loading={busy} onClick={() => void save()}>
            {t('talk.save')}
          </Button>
        }
      >
        <TextArea
          label={t('talk.note')}
          hint={t('common.optional')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={t('talk.notePlaceholder')}
        />
      </Sheet>
    </div>
  );
}
