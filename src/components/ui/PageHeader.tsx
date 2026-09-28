import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroArt, useCopy } from '@/theme';
import { IconButton } from './Button';

/**
 * Top of a screen: optional back button, title, and a trailing action. Tab
 * screens pass `hero` for a band with the theme's own header art.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  action,
  hero,
}: {
  title: string;
  subtitle?: string;
  back?: boolean | string;
  action?: ReactNode;
  hero?: boolean;
}) {
  const t = useCopy();
  const navigate = useNavigate();
  const body = (
    <>
      {back && (
        <IconButton
          icon="back"
          label={t('common.back')}
          className="-ml-2"
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
        />
      )}
      <div className="relative min-w-0 flex-1">
        <h1 className="truncate text-2xl leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action && <div className="relative">{action}</div>}
    </>
  );
  if (hero) {
    return (
      <header className="sp-panel relative -mx-1 mb-3 mt-[calc(0.75rem+env(safe-area-inset-top))] flex min-h-[96px] items-center gap-2 overflow-hidden px-4 py-3">
        <HeroArt
          variant="tab"
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-[70%]"
        />
        {body}
      </header>
    );
  }
  return (
    <header className="flex items-center gap-1 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      {body}
    </header>
  );
}
