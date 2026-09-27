import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Logo, Panel, Splash } from '@/components/ui';
import { qk } from '@/lib/queryKeys';
import { acceptMemberInvite, peekInvite } from '@/modules/households/api';
import { useCopy } from '@/theme';
import { useAuth } from '../auth/AuthProvider';
import { pending } from '../auth/pending';
import { ProfileFields, type ProfileValue } from '../components/ProfileFields';

function SignInFirst({ path }: { path: string }) {
  const t = useCopy();
  const navigate = useNavigate();
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-sm flex-col items-center justify-center px-6 text-center">
      <Logo size={72} />
      <h1 className="mt-4 text-2xl">{t('invite.signInFirst')}</h1>
      <Button
        className="mt-6"
        size="lg"
        onClick={() => {
          pending.setPath(path);
          navigate('/signin');
        }}
      >
        {t('auth.google')}
      </Button>
    </main>
  );
}

function InviteProblem({ error }: { error: string }) {
  const t = useCopy();
  const navigate = useNavigate();
  const message =
    error === 'rate_limited'
      ? t('invite.rateLimited')
      : error === 'already_member'
        ? t('invite.alreadyMember')
        : t('invite.invalid');
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-sm flex-col justify-center px-6">
      <EmptyState
        icon="link"
        title={message}
        action={
          <Button onClick={() => navigate(error === 'already_member' ? '/' : '/welcome')}>
            {t('common.next')}
          </Button>
        }
      />
    </main>
  );
}

function usePeek(code: string, enabled: boolean) {
  return useQuery({
    queryKey: ['peek', code],
    queryFn: () => peekInvite(code),
    enabled,
    retry: false,
    staleTime: Infinity,
  });
}

/** /start/{code}: an operator invite that opens the setup wizard. */
export function StartInvitePage() {
  const { code = '' } = useParams();
  const { user, loading } = useAuth();
  const peek = usePeek(code, !!user);
  if (loading || (user && peek.isLoading)) return <Splash />;
  if (!user) return <SignInFirst path={`/start/${code}`} />;
  const data = peek.data;
  if (!data || !data.ok) return <InviteProblem error={data && !data.ok ? data.error : 'invalid'} />;
  if (data.already_member) return <InviteProblem error="already_member" />;
  if (data.kind !== 'household') return <Navigate to={`/join/${code}`} replace />;
  pending.setStartCode(code);
  return <Navigate to="/setup" replace />;
}

/** /join/{code}: a member invite into an existing household. */
export function JoinInvitePage() {
  const t = useCopy();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { code = '' } = useParams();
  const { user, loading } = useAuth();
  const peek = usePeek(code, !!user);
  const firstName =
    String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? '').split(' ')[0] ?? '';
  const [profile, setProfile] = useState<ProfileValue>({
    displayName: firstName,
    avatar: 'classic/sprout',
    color: 'mint',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || (user && peek.isLoading)) return <Splash />;
  if (!user) return <SignInFirst path={`/join/${code}`} />;
  const data = peek.data;
  if (!data || !data.ok) return <InviteProblem error={data && !data.ok ? data.error : 'invalid'} />;
  if (data.already_member) return <InviteProblem error="already_member" />;
  if (data.kind !== 'member') return <Navigate to={`/start/${code}`} replace />;
  const household = data.household_name ?? '';

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await acceptMemberInvite(code, {
        ...profile,
        displayName: profile.displayName.trim(),
      });
      if (!res.ok) {
        setError(res.error === 'rate_limited' ? t('invite.rateLimited') : t('invite.invalid'));
        return;
      }
      await qc.invalidateQueries({ queryKey: qk.membership(user.id) });
      navigate('/', { replace: true });
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-[calc(2rem+env(safe-area-inset-top))]">
      <h1 className="text-3xl">{t('invite.joinTitle', { household })}</h1>
      <p className="mt-2 text-ink-muted">{t('invite.joinBody', { household })}</p>
      <Panel className="mt-6">
        <ProfileFields value={profile} onChange={setProfile} themeId="classic" />
      </Panel>
      {error && (
        <p role="alert" className="mt-4 font-bold">
          {error}
        </p>
      )}
      <Button
        className="mt-6"
        size="lg"
        block
        loading={busy}
        disabled={!profile.displayName.trim()}
        onClick={join}
      >
        {t('invite.joinCta')}
      </Button>
    </main>
  );
}
