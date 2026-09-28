import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Chip,
  EmptyState,
  Icon,
  IconButton,
  PageHeader,
  Panel,
  SectionTitle,
  Splash,
  Tag,
} from '@/components/ui';
import { mediumDate } from '@/lib/dates';
import { useHousehold } from '@/modules/households/context';
import { useLocations } from '@/modules/locations/hooks';
import { locationLabel } from '@/modules/locations/logic';
import { useDocuments, useItems, useSignedUrls } from '@/modules/stuff/hooks';
import { searchItems, warrantyWatch } from '@/modules/stuff/logic';
import { useCopy } from '@/theme';
import { Tip } from '../help/Tip';
import { ItemRowLink } from './ItemRowLink';

type Filter = 'here' | 'gone' | 'archived';

/** The Stuff tab: "Where is…" search, warranty watch, and everything you own. */
export function StuffPage() {
  const t = useCopy();
  const navigate = useNavigate();
  const { today } = useHousehold();
  const items = useItems();
  const docs = useDocuments();
  const { locations } = useLocations();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('here');

  const all = useMemo(() => items.data ?? [], [items.data]);
  const place = (id: string | null) => locationLabel(id, locations);
  const visible = useMemo(() => {
    const pool = all.filter((i) =>
      filter === 'archived'
        ? !!i.archived_at
        : !i.archived_at &&
          (filter === 'here'
            ? i.status === 'active' || i.status === 'lent'
            : i.status !== 'active' && i.status !== 'lent'),
    );
    return searchItems(pool, query, (id) => locationLabel(id, locations));
  }, [all, filter, query, locations]);
  const watch = useMemo(() => warrantyWatch(all, today), [all, today]);

  // Newest photo per item, for thumbnails.
  const photoByItem = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of docs.data ?? []) {
      if (d.item_id && d.kind === 'photo' && d.thumb_path && !m.has(d.item_id)) {
        m.set(d.item_id, d.thumb_path);
      }
    }
    return m;
  }, [docs.data]);
  const thumbs = useSignedUrls(visible.slice(0, 60).map((i) => photoByItem.get(i.id)));

  if (items.isLoading) return <Splash />;

  return (
    <div className="pb-24">
      <PageHeader
        hero
        title={t('stuff.name')}
        action={
          <div className="flex items-center gap-2">
            <IconButton
              icon="scan"
              label={t('nav.scan')}
              onClick={() => navigate('/scan')}
              className="bg-surface shadow-card"
            />
            <Button size="sm" icon="plus" onClick={() => navigate('/stuff/new')}>
              {t('stuff.add')}
            </Button>
          </div>
        }
      />
      <div className="sticky top-0 z-10 -mx-4 bg-bg px-4 pb-2 pt-1">
        <label htmlFor="stuff-search" className="sr-only">
          {t('stuff.search')}
        </label>
        <input
          id="stuff-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('stuff.search')}
          className="sp-input min-h-[48px] w-full"
          autoComplete="off"
        />
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <Chip selected={filter === 'here'} onClick={() => setFilter('here')}>
          {t('stuff.filter.here')}
        </Chip>
        <Chip selected={filter === 'gone'} onClick={() => setFilter('gone')}>
          {t('stuff.filter.gone')}
        </Chip>
        <Chip selected={filter === 'archived'} onClick={() => setFilter('archived')}>
          {t('stuff.filter.archived')}
        </Chip>
      </div>

      {!query && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Link
            to="/stuff/docs"
            className="sp-panel flex min-h-[56px] items-center gap-2 p-3 font-bold"
          >
            <Icon name="archive" size={20} />
            {t('docs.household')}
          </Link>
          <Link
            to="/stuff/labels"
            className="sp-panel flex min-h-[56px] items-center gap-2 p-3 font-bold"
          >
            <Icon name="scan" size={20} />
            {t('labels.title')}
          </Link>
        </div>
      )}

      {!query && filter === 'here' && watch.length > 0 && (
        <>
          <SectionTitle>{t('stuff.warrantyWatch')}</SectionTitle>
          <Panel className="mb-2">
            <ul className="flex flex-col gap-2">
              {watch.map(({ item, daysLeft }) => (
                <li key={item.id}>
                  <Link to={`/stuff/${item.id}`} className="flex items-center gap-2">
                    <Icon name="shield" size={18} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-bold">{item.name}</span>
                    <Tag tone="accent">
                      {daysLeft === 0
                        ? t('stuff.warrantyToday')
                        : t('stuff.warrantyEnds', {
                            day: mediumDate(item.warranty_until as string, today),
                            count: daysLeft,
                          })}
                    </Tag>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}

      {all.length === 0 ? (
        <>
          <Tip id="stuff.start" text="tip.stuff.start" className="mb-3" />
          <EmptyState
            icon="stuff"
            title={t('stuff.empty')}
            body={t('stuff.emptyBody')}
            action={
              <Button icon="plus" onClick={() => navigate('/stuff/new')}>
                {t('stuff.add')}
              </Button>
            }
          />
        </>
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-ink-muted">
          {query ? t('stuff.noMatch', { query }) : t('stuff.noneHere')}
        </p>
      ) : (
        <>
          {query && (
            <p className="mb-2 px-1 text-sm text-ink-muted">
              {t('stuff.results', { count: visible.length })}
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {visible.map((item) => {
              const photo = photoByItem.get(item.id);
              return (
                <ItemRowLink
                  key={item.id}
                  item={item}
                  place={place(item.location_id)}
                  thumb={photo ? thumbs.data?.[photo] : undefined}
                />
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
