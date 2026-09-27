import { useNavigate } from 'react-router-dom';
import { Button, EmptyState } from '@/components/ui';
import { useCopy } from '@/theme';

export function NotFound() {
  const t = useCopy();
  const navigate = useNavigate();
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-sm flex-col justify-center px-6">
      <EmptyState
        icon="map"
        title={t('common.error')}
        action={<Button onClick={() => navigate('/')}>{t('nav.today')}</Button>}
      />
    </main>
  );
}

/** Shown if a screen crashes, so the app never goes blank. */
export function InviteProblemRoute() {
  return <NotFound />;
}
