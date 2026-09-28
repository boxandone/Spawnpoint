import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';
import { EmptyState, PageHeader, Splash } from '@/components/ui';
import { useLocations } from '@/modules/locations/hooks';
import { resolveCode } from '@/modules/stuff/api';
import { normalizeCode } from '@/modules/stuff/logic';
import { useCopy } from '@/theme';

/**
 * A scanned label: /s/{code}. Members of the household land on the item or
 * place. For anyone else the code finds nothing, and the page says only that.
 */
export function ShortCodePage() {
  const t = useCopy();
  const { code = '' } = useParams();
  const normal = normalizeCode(code);
  const { locations, isLoading: locLoading } = useLocations();
  const q = useQuery({
    queryKey: ['shortCode', normal],
    queryFn: () => resolveCode(normal as string),
    enabled: !!normal,
  });

  if (normal && (q.isLoading || locLoading)) return <Splash />;
  const hit = q.data;
  if (hit?.item_id) return <Navigate to={`/stuff/${hit.item_id}`} replace />;
  if (hit?.location_id) {
    const place = locations.find((l) => l.id === hit.location_id);
    return (
      <Navigate
        to={place?.kind === 'area' ? `/areas/${place.id}` : `/places/${hit.location_id}`}
        replace
      />
    );
  }
  return (
    <div>
      <PageHeader title={t('scan.title')} back="/stuff" />
      <EmptyState icon="scan" title={t('scan.notYours')} body={t('scan.notYoursBody')} />
    </div>
  );
}
