import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, Icon, Logo, Panel, Splash, TextField } from '@/components/ui';
import { peekInvite, signOut } from '@/modules/households/api';
import { useMembershipQuery, usePublicConfig } from '@/modules/households/hooks';
import { useCopy } from '@/theme';
import { parseInvite, pending } from '../auth/pending';

/** Signed in, but no household yet: "You'll need an invite." */
export function NeedInvitePage() {
  const t = useCopy();
  const navigate = useNavigate();
  const membership = useMembershipQuery();
  const config = usePublicConfig();
  const [mode, setMode] = useState<'none' | 'link' | 'start'>('none');
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (membership.isLoading) return <Splash />;
  if (membership.data) return <Navigate to="/" replace />;
  const open = config.data?.household_creation === 'open';

  const go = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = parseInvite(input);
    if (!parsed) return setError(t('invite.invalid'));
    if (parsed.kind === 'start') return navigate(`/start/${parsed.code}`);
    if (parsed.kind === 'join') return navigate(`/join/${parsed.code}`);
    setBusy(true);
    try {
      const peek = await peekInvite(parsed.code);
      if (!peek.ok)
        return setError(
          peek.error === 'rate_limited' ? t('invite.rateLimited') : t('invite.invalid'),
        );
      navigate(`/${peek.kind === 'household' ? 'start' : 'join'}/${parsed.code}`);
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size={72} />
        <h1 className="mt-4 text-3xl">{t('invite.needTitle')}</h1>
        <p className="mt-2 text-ink-muted">{t('invite.needBody')}</p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          block
          icon="link"
          variant={mode === 'link' ? 'primary' : 'secondary'}
          onClick={() => setMode('link')}
        >
          {t('invite.haveLink')}
        </Button>
        <Button
          size="lg"
          block
          icon="home"
          variant={mode === 'start' ? 'primary' : 'secondary'}
          onClick={() => {
            if (open) {
              pending.setStartCode(null);
              navigate('/setup');
            } else setMode('start');
          }}
        >
          {t('invite.startHousehold')}
        </Button>
      </div>

      {mode !== 'none' && (
        <Panel className="mt-5">
          <form onSubmit={go} className="flex flex-col gap-3">
            {mode === 'start' && (
              <p className="text-sm text-ink-muted">{t('invite.startCodeHint')}</p>
            )}
            <TextField
              label={t('invite.pasteLabel')}
              placeholder={t('invite.pastePlaceholder')}
              value={input}
              autoFocus
              autoCapitalize="characters"
              onChange={(e) => setInput(e.target.value)}
              error={error ?? undefined}
            />
            <Button type="submit" loading={busy} disabled={!input.trim()}>
              {t('invite.go')}
            </Button>
          </form>
        </Panel>
      )}

      <button
        type="button"
        onClick={() => void signOut()}
        className="mx-auto mt-8 inline-flex min-h-[44px] items-center gap-2 px-3 text-sm font-bold text-ink-muted"
      >
        <Icon name="logout" size={18} />
        {t('auth.signOut')}
      </button>
    </main>
  );
}
