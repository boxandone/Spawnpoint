import { Link, useParams } from 'react-router-dom';
import { EmptyState, Icon, PageHeader, Splash } from '@/components/ui';
import { useLocations } from '@/modules/locations/hooks';
import { useCopy } from '@/theme';
import { PlaceStuff } from './PlaceStuff';

/** A spot or a zone: what's kept there. Areas use their own page, which adds chores. */
export function PlacePage() {
  const t = useCopy();
  const { id = '' } = useParams();
  const { locations, isLoading } = useLocations();
  if (isLoading) return <Splash />;
  const place = locations.find((l) => l.id === id);
  if (!place) {
    return (
      <div>
        <PageHeader title={t('places.title')} back="/stuff" />
        <EmptyState icon="pin" title={t('places.notFound')} />
      </div>
    );
  }
  const parent = locations.find((l) => l.id === place.parent_id);
  const areas = locations.filter(
    (l) => l.parent_id === place.id && l.kind === 'area' && !l.archived_at,
  );

  return (
    <div className="pb-8">
      <PageHeader
        title={place.name}
        subtitle={parent ? parent.name : undefined}
        back={
          parent
            ? parent.kind === 'area'
              ? `/areas/${parent.id}`
              : `/places/${parent.id}`
            : '/stuff'
        }
      />
      {areas.length > 0 && (
        <ul className="mb-2 flex flex-col gap-2">
          {areas.map((a) => (
            <li key={a.id}>
              <Link
                to={`/areas/${a.id}`}
                className="sp-panel flex min-h-[56px] items-center gap-3 p-3"
              >
                <Icon name="home" size={20} />
                <span className="flex-1 font-bold">{a.name}</span>
                <Icon name="chevron" size={18} className="text-ink-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <PlaceStuff locationId={place.id} />
    </div>
  );
}
