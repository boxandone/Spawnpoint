import { useMemo } from 'react';
import { PageHeader, Splash } from '@/components/ui';
import { DocumentList } from '@/modules/stuff/components/DocumentList';
import { useDocuments } from '@/modules/stuff/hooks';
import { useCopy } from '@/theme';

/** Household papers that aren't about one item: insurance, lease, and so on. */
export function DocumentsPage() {
  const t = useCopy();
  const docs = useDocuments();
  const household = useMemo(() => (docs.data ?? []).filter((d) => !d.item_id), [docs.data]);
  if (docs.isLoading) return <Splash />;
  return (
    <div className="pb-8">
      <PageHeader title={t('docs.household')} subtitle={t('docs.householdBody')} back="/stuff" />
      <DocumentList docs={household} itemId={null} />
    </div>
  );
}
