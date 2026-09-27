import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { GoogleMark } from '@/components/brand/GoogleMark';
import { Button, Logo, Panel, TextField } from '@/components/ui';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { useCopy } from '@/theme';
import { useAuth } from './AuthProvider';
import { pending } from './pending';

export function SignInPage() {
  const t = useCopy();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (user) return <Navigate to={pending.takePath() ?? '/'} replace />;

  const google = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) {
      setError(t('common.error'));
      setBusy(false);
    }
  };

  const devSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setBusy(false);
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo size={88} />
        <h1 className="mt-4 text-4xl">{t('app.name')}</h1>
        <p className="mt-2 text-ink-muted">{t('auth.subtitle')}</p>
      </div>
      <Button size="lg" variant="secondary" block onClick={google} loading={busy}>
        <GoogleMark />
        {t('auth.google')}
      </Button>
      <p className="mt-3 text-center text-sm text-ink-muted">{t('auth.privacyNote')}</p>
      {error && (
        <p role="alert" className="mt-4 text-center font-bold">
          {error}
        </p>
      )}

      {env.devEmailLogin && (
        <Panel className="mt-10" tone="surface-2">
          <form onSubmit={devSignIn} className="flex flex-col gap-3">
            <h2 className="text-lg">{t('auth.devTitle')}</h2>
            <p className="text-sm text-ink-muted">{t('auth.devHint')}</p>
            <TextField
              label={t('auth.email')}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label={t('auth.password')}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" loading={busy}>
              {t('auth.signIn')}
            </Button>
          </form>
        </Panel>
      )}
    </main>
  );
}

export function AuthCallbackPage() {
  const t = useCopy();
  const { user, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(id);
  }, []);
  if (!loading && user) return <Navigate to={pending.takePath() ?? '/'} replace />;
  if (timedOut && !user) return <Navigate to="/signin" replace />;
  return (
    <div className="grid min-h-[100dvh] place-items-center" role="status">
      <div className="flex flex-col items-center gap-3">
        <Logo size={64} className="motion-safe:animate-bounce" />
        <p className="text-ink-muted">{t('auth.finishing')}</p>
      </div>
    </div>
  );
}
