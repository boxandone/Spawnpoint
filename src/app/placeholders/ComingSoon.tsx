import { EmptyState, PageHeader, type IconName } from '@/components/ui';
import { useCopy, type CopyKey } from '@/theme';

/** Tabs for modules that arrive in later phases. */
export function ComingSoon({ title, icon }: { title: CopyKey; icon: IconName }) {
  const t = useCopy();
  return (
    <div>
      <PageHeader title={t(title)} />
      <EmptyState icon={icon} title={t('common.comingSoon')} body={t('common.comingSoonBody')} />
    </div>
  );
}
