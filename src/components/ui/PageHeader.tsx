import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCopy } from '@/theme';
import { IconButton } from './Button';

/** Top of a screen: optional back button, title, and a trailing action. */
export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: boolean | string;
  action?: ReactNode;
}) {
  const t = useCopy();
  const navigate = useNavigate();
  return (
    <header className="flex items-center gap-1 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      {back && (
        <IconButton
          icon="back"
          label={t('common.back')}
          className="-ml-2"
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
        />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
