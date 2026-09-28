import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Icon, Panel, SectionTitle } from '@/components/ui';
import { useLocationMutations, useLocations } from '@/modules/locations/hooks';
import { locationLabel } from '@/modules/locations/logic';
import { QrCode } from '@/modules/stuff/components/QrCode';
import { useItems, useShortCodes } from '@/modules/stuff/hooks';
import { labelUrl } from '@/modules/stuff/logic';
import { useCopy } from '@/theme';
import { ItemRowLink } from './ItemRowLink';

/**
 * What's stored in a place (and the spots inside it), its spots, and its QR
 * label. Shown on area pages and on spot and zone pages.
 */
export function PlaceStuff({ locationId }: { locationId: string }) {
  const t = useCopy();
  const navigate = useNavigate();
  const { locations, ancestry } = useLocations();
  const items = useItems();
  const codes = useShortCodes();
  const { create } = useLocationMutations();
  const [spotName, setSpotName] = useState('');
  const place = locations.find((l) => l.id === locationId);

  const here = useMemo(
    () =>
      (items.data ?? [])
        .filter(
          (i) =>
            !i.archived_at &&
            i.status !== 'sold' &&
            i.status !== 'donated' &&
            i.status !== 'disposed' &&
            i.location_id !== null &&
            ancestry(i.location_id).includes(locationId),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [items.data, ancestry, locationId],
  );
  const spots = locations.filter(
    (l) => l.parent_id === locationId && l.kind === 'spot' && !l.archived_at,
  );
  const code = codes.byLocation.get(locationId);
  if (!place) return null;

  const addSpot = (e: FormEvent) => {
    e.preventDefault();
    if (!spotName.trim()) return;
    create.mutate([
      { kind: 'spot', name: spotName.trim(), parent_id: locationId, sort: locations.length + 1 },
    ]);
    setSpotName('');
  };

  return (
    <>
      <SectionTitle
        action={
          <Button
            size="sm"
            variant="ghost"
            icon="plus"
            onClick={() => navigate(`/stuff/new?place=${locationId}`)}
          >
            {t('stuff.add')}
          </Button>
        }
      >
        {t('places.stuffHere', { count: here.length })}
      </SectionTitle>
      {here.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('places.nothingHere')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {here.map((item) => (
            <ItemRowLink
              key={item.id}
              item={item}
              place={
                item.location_id === locationId ? null : locationLabel(item.location_id, locations)
              }
            />
          ))}
        </ul>
      )}

      {place.kind === 'area' && (
        <>
          <SectionTitle>{t('places.spots')}</SectionTitle>
          <Panel className="flex flex-col gap-2">
            {spots.length > 0 && (
              <ul className="divide-y divide-line">
                {spots.map((s) => (
                  <li key={s.id}>
                    <Link to={`/places/${s.id}`} className="flex min-h-[48px] items-center gap-2">
                      <Icon name="pin" size={18} className="text-ink-muted" />
                      <span className="flex-1 font-bold">{s.name}</span>
                      <Icon name="chevron" size={18} className="text-ink-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={addSpot} className="flex gap-2">
              <label htmlFor="new-spot" className="sr-only">
                {t('places.addSpot')}
              </label>
              <input
                id="new-spot"
                value={spotName}
                onChange={(e) => setSpotName(e.target.value)}
                placeholder={t('places.addSpotPlaceholder')}
                maxLength={60}
                className="sp-input min-h-[48px] flex-1"
              />
              <button
                type="submit"
                aria-label={t('places.addSpot')}
                className="sp-btn sp-btn-secondary grid min-h-[48px] w-12 place-items-center px-0"
              >
                <Icon name="plus" size={20} strokeWidth={2.5} />
              </button>
            </form>
          </Panel>
        </>
      )}

      {code && (
        <>
          <SectionTitle>{t('labels.one')}</SectionTitle>
          <Panel className="flex items-center gap-4">
            <QrCode
              value={labelUrl(window.location.origin, code)}
              size={96}
              label={t('labels.qrFor', { name: place.name })}
            />
            <div className="min-w-0 flex-1">
              <p className="font-num text-lg font-bold tracking-widest">{code}</p>
              <p className="text-sm text-ink-muted">{t('labels.placeBody')}</p>
              <Link
                to={`/stuff/labels?places=${locationId}`}
                className="mt-1 inline-flex min-h-[44px] items-center font-bold underline underline-offset-2"
              >
                {t('labels.print')}
              </Link>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
