import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import {
  Button,
  EmptyState,
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
  createHouseholdInvite,
  fetchOperatorStats,
  listInvites,
  revokeInvite,
} from '@/modules/households/api';
import { useIsOperator } from '@/modules/households/hooks';
import { formatBytes, guessTimezone, inviteLink, inviteStatus } from '@/modules/households/logic';
import { useCopy, type CopyKey } from '@/theme';

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
          {(invites.data ?? []).map((i) => {
            const status = inviteStatus(i);
            return (
              <li key={i.id} className="flex min-h-[52px] items-center gap-2 py-1">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{i.label || '—'}</span>
                  <span className="block text-xs text-ink-muted">
                    {t('settings.expires', {
                      day: mediumDate(dayOfInstant(i.expires_at, tz), today),
                    })}
                  </span>
                </span>
                <Tag tone={status === 'active' ? 'success' : 'neutral'}>
                  {t(`operator.status.${status}` as CopyKey)}
                </Tag>
                {status === 'active' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await revokeInvite(i.id);
                      await qc.invalidateQueries({ queryKey: qk.invites('household') });
                    }}
                  >
                    {t('settings.revoke')}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
