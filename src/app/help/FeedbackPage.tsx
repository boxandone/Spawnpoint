import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button, PageHeader, Panel, SectionTitle, Tag, TextArea, useToast } from '@/components/ui';
import { listFeedback, sendFeedback, type FeedbackKind } from '@/modules/feedback/api';
import { useCopy, type CopyKey } from '@/theme';
import { APP_VERSION } from '../updates/releases';

const KINDS: FeedbackKind[] = ['bug', 'question', 'idea'];

/** Send a bug report, question, or idea privately to the operator, and see replies. */
export function FeedbackPage() {
  const t = useCopy();
  const toast = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { kind = 'question' } = useParams();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = useQuery({ queryKey: ['feedback', 'mine'], queryFn: () => listFeedback() });

  if (!KINDS.includes(kind as FeedbackKind)) return <Navigate to="/help" replace />;
  const k = kind as FeedbackKind;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      let page = '';
      try {
        page = sessionStorage.getItem('sp.lastPath') ?? '';
      } catch {
        page = '';
      }
      await sendFeedback({ kind: k, message, page, appVersion: APP_VERSION });
      await qc.invalidateQueries({ queryKey: ['feedback'] });
      toast.show({ message: t('feedback.sent'), tone: 'success' });
      navigate('/help');
    } catch (err) {
      setError(/too much feedback/i.test(String(err)) ? t('feedback.tooMany') : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <PageHeader title={t(`feedback.title.${k}` as CopyKey)} back="/help" />
      <Panel>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <TextArea
            label={t(`feedback.label.${k}` as CopyKey)}
            hint={t(`feedback.hint.${k}` as CopyKey)}
            value={message}
            maxLength={2000}
            rows={6}
            autoFocus
            onChange={(e) => setMessage(e.target.value)}
          />
          {error && (
            <p role="alert" className="font-bold">
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            icon="check"
            loading={busy}
            disabled={message.trim().length < 3}
          >
            {t('feedback.send')}
          </Button>
          <p className="text-sm text-ink-muted">{t('feedback.privacy')}</p>
        </form>
      </Panel>

      {(mine.data?.length ?? 0) > 0 && (
        <>
          <SectionTitle>{t('feedback.yours')}</SectionTitle>
          <ul className="sp-panel divide-y divide-line">
            {mine.data!.map((f) => (
              <li key={f.id} className="flex flex-col gap-1 px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <Tag>{t(`feedback.kind.${f.kind}` as CopyKey)}</Tag>
                  <Tag tone={f.status === 'done' ? 'success' : 'neutral'}>
                    {t(`feedback.status.${f.status}` as CopyKey)}
                  </Tag>
                  <span className="ml-auto text-ink-muted">{f.created_at.slice(0, 10)}</span>
                </div>
                <p className="whitespace-pre-wrap">{f.message}</p>
                {f.operator_note && (
                  <p className="rounded-theme-sm bg-surface-2 px-3 py-2 text-sm">
                    {t('feedback.reply', { note: f.operator_note })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
