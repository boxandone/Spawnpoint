import { Icon } from '@/components/ui';
import { useCopy, type CopyKey } from '@/theme';
import { useGuide } from './tips';

/** A friendly, dismissible hint. Hidden when guide mode is off or once dismissed. */
export function Tip({ id, text, className }: { id: string; text: CopyKey; className?: string }) {
  const t = useCopy();
  const guide = useGuide();
  if (!guide.isVisible(id)) return null;
  return (
    <aside
      className={`flex items-start gap-3 rounded-theme bg-surface-2 p-3 shadow-[inset_0_0_0_1.5px_var(--line)] ${className ?? ''}`}
      aria-label={t('tip.label')}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
        <Icon name="sparkle" size={16} />
      </span>
      <p className="min-w-0 flex-1 pt-1 text-sm">{t(text)}</p>
      <button
        type="button"
        onClick={() => guide.dismiss(id)}
        className="min-h-[36px] shrink-0 rounded-full px-3 text-sm font-bold underline underline-offset-2"
      >
        {t('tip.dismiss')}
      </button>
    </aside>
  );
}

/** Shows only the first tip that hasn't been dismissed, so screens never stack tips. */
export function TipQueue({
  tips,
  className,
}: {
  tips: Array<{ id: string; text: CopyKey }>;
  className?: string;
}) {
  const guide = useGuide();
  const next = tips.find((tip) => guide.isVisible(tip.id));
  return next ? <Tip id={next.id} text={next.text} className={className} /> : null;
}
