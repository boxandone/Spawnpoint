import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Logo, Panel } from '@/components/ui';
import { fetchPublicConfig } from '@/modules/households/api';
import { useCopy, type CopyKey } from '@/theme';
import { useAuth } from '../auth/AuthProvider';

// Update when the wording changes.
const UPDATED = '2026-09-27';

function useOperatorName(): string | null {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['publicConfig'],
    queryFn: fetchPublicConfig,
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  return data?.operator_name?.trim() || null;
}

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useCopy();
  const operator = useOperatorName();
  return (
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <Link to="/" className="inline-flex items-center gap-2" aria-label={t('app.name')}>
        <Logo size={40} />
        <span className="font-display text-xl">{t('app.name')}</span>
      </Link>
      <h1 className="mt-6 text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{t('legal.updated', { date: UPDATED })}</p>
      <Panel className="mt-5 flex flex-col gap-2">
        <p className="font-bold">
          {operator ? t('legal.runBy', { name: operator }) : t('legal.runByUnknown')}
        </p>
        <p className="text-ink-muted">{t('legal.openSource')}</p>
      </Panel>
      <div className="mt-6 flex flex-col gap-5 leading-relaxed">{children}</div>
      <LegalLinks className="mt-10" />
    </main>
  );
}

function Section({ title, body }: { title: CopyKey; body: CopyKey }) {
  const t = useCopy();
  return (
    <section>
      <h2 className="text-lg">{t(title)}</h2>
      <p className="mt-1">{t(body)}</p>
    </section>
  );
}

/** Public privacy policy (docs/SPEC.md 4.1 "Your data"). */
export function PrivacyPage() {
  const t = useCopy();
  return (
    <LegalShell title={t('legal.privacyTitle')}>
      <Section title="legal.p.googleTitle" body="legal.p.google" />
      <Section title="legal.p.useTitle" body="legal.p.use" />
      <Section title="legal.p.storedTitle" body="legal.p.stored" />
      <Section title="legal.p.whoTitle" body="legal.p.who" />
      <Section title="legal.p.whereTitle" body="legal.p.where" />
      <Section title="legal.p.controlTitle" body="legal.p.control" />
      <Section title="legal.p.contactTitle" body="legal.p.contact" />
    </LegalShell>
  );
}

export function TermsPage() {
  const t = useCopy();
  return (
    <LegalShell title={t('legal.termsTitle')}>
      <p>{t('legal.t.use')}</p>
      <p>{t('legal.t.invite')}</p>
      <p>{t('legal.t.availability')}</p>
      <p>
        <Link to="/privacy" className="font-bold underline underline-offset-2">
          {t('legal.t.privacy')}
        </Link>
      </p>
    </LegalShell>
  );
}

export function LegalLinks({ className }: { className?: string }) {
  const t = useCopy();
  return (
    <nav
      className={`flex justify-center gap-6 text-sm ${className ?? ''}`}
      aria-label={t('legal.privacyTitle')}
    >
      <Link
        to="/privacy"
        className="inline-flex min-h-[44px] items-center font-bold text-ink-muted underline underline-offset-2"
      >
        {t('legal.privacyLink')}
      </Link>
      <Link
        to="/terms"
        className="inline-flex min-h-[44px] items-center font-bold text-ink-muted underline underline-offset-2"
      >
        {t('legal.termsLink')}
      </Link>
    </nav>
  );
}
