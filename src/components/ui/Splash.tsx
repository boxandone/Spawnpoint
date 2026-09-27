import { useCopy } from '@/theme';
import { Logo } from './Logo';

export function Splash({ label }: { label?: string }) {
  const t = useCopy();
  return (
    <div className="grid min-h-[100dvh] place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <Logo size={64} className="motion-safe:animate-bounce" />
        <p className="text-ink-muted">{label ?? t('common.loading')}</p>
      </div>
    </div>
  );
}
