import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import {
  Button,
  EmptyState,
  IconButton,
  PageHeader,
  Panel,
  SectionTitle,
  Splash,
  Tag,
  TextField,
} from '@/components/ui';
import { dayOfInstant, mediumDate, todayIn } from '@/lib/dates';
import { qk } from '@/lib/queryKeys';
import {
  renameInvite,
  createHouseholdInvite,
  fetchOperatorStats,
  listInvites,
  revokeInvite,
} from '@/modules/households/api';
import { useIsOperator } from '@/modules/households/hooks';
import { formatBytes, guessTimezone, inviteLink, inviteStatus } from '@/modules/households/logic';
import { listFeedback, setFeedbackStatus } from '@/modules/feedback/api';
import type { MemberInvite } from '@/modules/households/types';
import { useCopy, type CopyKey } from '@/theme';

/** Bug reports, questions, and ideas from anyone on this site. */
function FeedbackInbox() {
  const t = useCopy();
  const qc = useQueryClient();
  const [showDone, setShowDone] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const list = useQuery({
    queryKey: ['feedback', 'operator', showDone],
    queryFn: () => listFeedback(showDone ? undefined : 'open'),
  });
  const items = list.data ?? [];
  const set = async (id: string, status: 'open' | 'done') => {
    await setFeedbackStatus(id, status, notes[id]);
    await qc.invalidateQueries({ queryKey: ['feedback'] });
  };

  return (
    <>
      <SectionTitle
        action={
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-pressed={showDone}
            className="min-h-[36px] px-1 text-sm font-bold underline underline-offset-2"
          >
            {t('feedback.showHandled')}
          </button>
        }
      >
        {t('feedback.operatorTitle')} · {items.filter((f) => f.status === 'open').length}
      </SectionTitle>
      {items.length === 0 ? (
        <Panel>
          <p className="text-sm text-ink-muted">{t('feedback.operatorEmpty')}</p>
        </Panel>
      ) : (
        <ul className="sp-panel divide-y divide-line">
          {items.map((f) => (
            <li key={f.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Tag
                  tone={f.kind === 'bug' ? 'accent' : f.kind === 'idea' ? 'secondary' : 'neutral'}
                >
                  {t(`feedback.kind.${f.kind}` as CopyKey)}
                </Tag>
                {f.status === 'done' && <Tag tone="success">{t('feedback.status.done')}</Tag>}
                <span className="text-ink-muted">
                  {f.household_id
                    ? t('feedback.from', { ref: f.household_id.slice(0, 8) })
                    : t('feedback.noHousehold')}
                </span>
                <span className="ml-auto font-num text-ink-muted">
                  {f.created_at.slice(0, 10)} · v{f.app_version ?? '?'} · {f.page || '/'}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{f.message}</p>
              {f.status === 'open' ? (
                <div className="flex items-end gap-2">
                  <TextField
                    className="min-w-0 flex-1"
                    label={t('feedback.notePlaceholder')}
                    value={notes[f.id] ?? ''}
                    maxLength={500}
                    onChange={(e) => setNotes((n) => ({ ...n, [f.id]: e.target.value }))}
                  />
                  <Button size="sm" onClick={() => void set(f.id, 'done')}>
                    {t('feedback.markDone')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {f.operator_note && (
                    <p className="flex-1 text-sm text-ink-muted">{f.operator_note}</p>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => void set(f.id, 'open')}>
                    {t('feedback.reopen')}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** One household invite: label (renamable), status, and the household it became. */
function InviteRow({ invite: i, tz, today }: { invite: MemberInvite; tz: string; today: string }) {
  const t = useCopy();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(i.label ?? '');
  const [busy, setBusy] = useState(false);
  const status = inviteStatus(i);
  const refresh = () => qc.invalidateQueries({ queryKey: qk.invites('household') });

  if (editing) {
    return (
      <li className="py-2">
        <form
          className="flex items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await renameInvite(i.id, label);
              await refresh();
              setEditing(false);
            } finally {
              setBusy(false);
            }
          }}
        >
          <TextField
            className="min-w-0 flex-1"
            label={t('operator.label')}
            placeholder={t('operator.labelPlaceholder')}
            value={label}
            maxLength={60}
            autoFocus
            onChange={(e) => setLabel(e.target.value)}
          />
          <Button type="submit" size="sm" loading={busy}>
            {t('common.save')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            {t('common.cancel')}
          </Button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex min-h-[52px] items-center gap-2 py-1">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{i.label || '—'}</span>
        <span className="block text-xs text-ink-muted">
          {i.created_household_id
            ? t('operator.createdHousehold', { ref: i.created_household_id.slice(0, 8) })
            : t('settings.expires', { day: mediumDate(dayOfInstant(i.expires_at, tz), today) })}
        </span>
      </span>
      <Tag tone={status === 'active' ? 'success' : 'neutral'}>
        {t(`operator.status.${status}` as CopyKey)}
      </Tag>
      <IconButton
        icon="edit"
        label={t('operator.rename', { label: i.label || '—' })}
        onClick={() => {
          setLabel(i.label ?? '');
          setEditing(true);
        }}
        className="text-ink-muted"
      />
      {status === 'active' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            await revokeInvite(i.id);
            await refresh();
          }}
        >
          {t('settings.revoke')}
        </Button>
      )}
    </li>
  );
}

/** Counts, storage sizes, and household invites. No way to browse any household's data. */
export function OperatorPage() {
  const t = useCopy();
  const qc = useQueryClient();
  const operator = useIsOperator();
  const stats = useQuery({
    queryKey: qk.operatorStats,
    queryFn: fetchOperatorStats,
    enabled: operator.data === true,
  });
  const invites = useQuery({
    queryKey: qk.invites('household'),
    queryFn: () => listInvites('household'),
    enabled: operator.data === true,
  });
  const [label, setLabel] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tz = guessTimezone();
  const today = todayIn(tz);

  if (operator.isLoading) return <Splash />;
  if (!operator.data) {
    return (
      <div>
        <PageHeader title={t('operator.title')} back="/" />
        <EmptyState icon="shield" title={t('operator.notOperator')} />
      </div>
    );
  }

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await createHouseholdInvite(label.trim() || null);
      if (res.ok) setLink(inviteLink(window.location.origin, 'start', res.code));
      setLabel('');
      await qc.invalidateQueries({ queryKey: qk.invites('household') });
      await qc.invalidateQueries({ queryKey: qk.operatorStats });
    } finally {
      setBusy(false);
    }
  };

  const s = stats.data;
  return (
    <div className="pb-6">
      <PageHeader title={t('operator.title')} subtitle={t('operator.body')} back="/" />

      <div className="grid grid-cols-2 gap-3">
        <Panel>
          <p className="text-sm text-ink-muted">{t('operator.households')}</p>
          <p className="font-num text-3xl font-bold">{s?.households ?? '–'}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-ink-muted">{t('operator.members')}</p>
          <p className="font-num text-3xl font-bold">{s?.members ?? '–'}</p>
        </Panel>
      </div>

      <FeedbackInbox />

      <SectionTitle>{t('operator.storage')}</SectionTitle>
      <Panel>
        {s && s.storage.length > 0 ? (
          <ul className="divide-y divide-line">
            {s.storage.map((row, i) => (
              <li
                key={`${row.household_ref}-${i}`}
                className="flex min-h-[44px] items-center justify-between font-num text-sm"
              >
                <span>#{row.household_ref}</span>
                <span>
                  {formatBytes(row.bytes)} / {s.storage_quota_mb} MB
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">–</p>
        )}
      </Panel>

      <SectionTitle>{t('operator.invites')}</SectionTitle>
      <Panel className="flex flex-col gap-3">
        <form onSubmit={create} className="flex flex-col gap-3">
          <TextField
            label={t('operator.label')}
            value={label}
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Button type="submit" icon="plus" loading={busy}>
            {t('operator.newInvite')}
          </Button>
        </form>
        {link && (
          <div className="rounded-theme bg-surface-2 p-3">
            <p className="text-sm text-ink-muted">{t('operator.linkOnce')}</p>
            <p className="mt-1 break-all font-num text-sm">{link}</p>
            <Button
              size="sm"
              variant="secondary"
              icon="copy"
              className="mt-2"
              onClick={() => void navigator.clipboard?.writeText(link)}
            >
              {t('common.copy')}
            </Button>
          </div>
        )}
        <ul className="divide-y divide-line">
          {(invites.data ?? []).map((i) => (
            <InviteRow key={i.id} invite={i} tz={tz} today={today} />
          ))}
        </ul>
      </Panel>
    </div>
  );
}
