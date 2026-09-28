import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
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
import { DocumentList, UploadSheet } from '@/modules/stuff/components/DocumentList';
import { QrCode } from '@/modules/stuff/components/QrCode';
import {
  useDocuments,
  useItems,
  useShortCodes,
  useSignedUrls,
  useStuffMutations,
} from '@/modules/stuff/hooks';
import { linkLabel } from '@/modules/lists/logic';
import { ITEM_STATUSES, labelUrl } from '@/modules/stuff/logic';
import { useCopy, type CopyKey } from '@/theme';

/** One item: photo, details, files, and its QR label. */
export function ItemPage() {
  const t = useCopy();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { today } = useHousehold();
  const items = useItems();
  const docs = useDocuments();
  const codes = useShortCodes();
  const { locations } = useLocations();
  const { update, archive } = useStuffMutations();
  const item = items.data?.find((i) => i.id === id);
  const itemDocs = useMemo(
    () => (docs.data ?? []).filter((d) => d.item_id === id),
    [docs.data, id],
  );
  const photo = itemDocs.find((d) => d.kind === 'photo' && d.mime_type.startsWith('image/'));
  const photoUrl = useSignedUrls([photo?.storage_path]);
  const [receiptOpen, setReceiptOpen] = useState(params.get('receipt') === '1');

  if (items.isLoading) return <Splash />;
  if (!item) {
    return (
      <div>
        <PageHeader title={t('stuff.name')} back="/stuff" />
        <EmptyState icon="stuff" title={t('stuff.notFound')} />
      </div>
    );
  }

  const code = codes.byItem.get(item.id);
  const place = locationLabel(item.location_id, locations);
  const rows: Array<[CopyKey, string | null]> = [
    ['stuff.where', [place, item.spot].filter(Boolean).join(' · ') || null],
    ['stuff.category', t(`stuff.cat.${item.category}` as CopyKey)],
    ['stuff.brand', item.brand],
    ['stuff.model', item.model],
    ['stuff.serial', item.serial],
    ['stuff.purchasedOn', item.purchased_on ? mediumDate(item.purchased_on, today) : null],
    [
      'stuff.price',
      item.price == null
        ? null
        : item.price.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    ],
    ['stuff.store', item.store],
    ['stuff.warrantyUntil', item.warranty_until ? mediumDate(item.warranty_until, today) : null],
    ['stuff.barcode', item.barcode],
  ];

  return (
    <div className="pb-8">
      <PageHeader
        title={item.name}
        back="/stuff"
        action={
          <IconButton
            icon="edit"
            label={t('stuff.edit')}
            onClick={() => navigate(`/stuff/${item.id}/edit`)}
          />
        }
      />

      {photo && photoUrl.data?.[photo.storage_path] && (
        <img
          src={photoUrl.data[photo.storage_path]}
          alt={item.name}
          className="mb-3 max-h-72 w-full rounded-theme bg-surface-2 object-cover"
        />
      )}

      {item.archived_at && (
        <Panel className="mb-3 flex items-center justify-between gap-2">
          <span className="text-sm">{t('stuff.isArchived')}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void update(item.id, { archived_at: null })}
          >
            {t('stuff.restore')}
          </Button>
        </Panel>
      )}

      <fieldset className="mb-3">
        <legend className="mb-1.5 px-0.5 text-sm font-bold">{t('stuff.statusLabel')}</legend>
        <div className="flex flex-wrap gap-2">
          {ITEM_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={item.status === s}
              onClick={() => void update(item.id, { status: s })}
              className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full px-3.5 text-sm font-semibold ${
                item.status === s
                  ? 'bg-primary text-primary-ink shadow-press'
                  : 'bg-surface text-ink shadow-[inset_0_0_0_2px_var(--line)]'
              }`}
            >
              {t(`stuff.status.${s}` as CopyKey)}
            </button>
          ))}
        </div>
      </fieldset>

      <Panel>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-ink-muted">{t(k)}</dt>
                <dd className="min-w-0 break-words font-bold">{v}</dd>
              </div>
            ))}
        </dl>
        {item.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 font-bold underline underline-offset-2"
          >
            <Icon name="link" size={18} />
            {t('stuff.openLink', { site: linkLabel(item.url) })}
          </a>
        )}
        {item.notes && <p className="mt-3 whitespace-pre-wrap text-sm">{item.notes}</p>}
      </Panel>

      <SectionTitle>{t('docs.section')}</SectionTitle>
      <DocumentList docs={itemDocs} itemId={item.id} />
      <UploadSheet
        open={receiptOpen}
        onClose={() => {
          setReceiptOpen(false);
          if (params.get('receipt')) setParams({}, { replace: true });
        }}
        itemId={item.id}
        initialKind="receipt"
      />

      {code && (
        <>
          <SectionTitle>{t('labels.one')}</SectionTitle>
          <Panel className="flex items-center gap-4">
            <QrCode
              value={labelUrl(window.location.origin, code)}
              size={96}
              label={t('labels.qrFor', { name: item.name })}
            />
            <div className="min-w-0 flex-1">
              <p className="font-num text-lg font-bold tracking-widest">{code}</p>
              <p className="text-sm text-ink-muted">{t('labels.oneBody')}</p>
              <Link
                to={`/stuff/labels?items=${item.id}`}
                className="mt-1 inline-flex min-h-[44px] items-center font-bold underline underline-offset-2"
              >
                {t('labels.print')}
              </Link>
            </div>
          </Panel>
        </>
      )}

      {!item.archived_at && (
        <Button
          variant="ghost"
          icon="archive"
          className="mt-6"
          onClick={() => {
            void archive(item);
            navigate('/stuff');
          }}
        >
          {t('stuff.archive')}
        </Button>
      )}
    </div>
  );
}
