import { useRef, useState } from 'react';
import { Button, Chip, Icon, IconButton, Sheet, TextField, useToast } from '@/components/ui';
import { mediumDate } from '@/lib/dates';
import { useHousehold } from '@/modules/households/context';
import { useCopy, type CopyKey } from '@/theme';
import { UploadError, type Doc } from '../api';
import { useDocumentMutations, useSignedUrls } from '../hooks';
import { DOC_KINDS, formatBytes, type DocKind } from '../logic';
import { ACCEPT_ATTR } from '../media';

/** A document's thumbnail, or an icon for PDFs and files without one. */
function DocThumb({ doc, url }: { doc: Doc; url?: string }) {
  return url ? (
    <img
      src={url}
      alt=""
      className="h-14 w-14 shrink-0 rounded-theme-sm bg-surface-2 object-cover"
      loading="lazy"
    />
  ) : (
    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-theme-sm bg-surface-2 text-ink-muted">
      <Icon name={doc.mime_type === 'application/pdf' ? 'archive' : 'sparkle'} size={24} />
    </span>
  );
}

/** Files for one item (or the household), opened through short-lived links. */
export function DocumentList({
  docs,
  itemId,
  planId = null,
}: {
  docs: Doc[];
  itemId: string | null;
  planId?: string | null;
}) {
  const t = useCopy();
  const { today } = useHousehold();
  const thumbs = useSignedUrls(docs.map((d) => d.thumb_path));
  const files = useSignedUrls(docs.map((d) => d.storage_path));
  const { remove } = useDocumentMutations();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <>
      {docs.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('docs.none')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {docs.map((doc) => {
            const href = files.data?.[doc.storage_path];
            const name = doc.title || t(`docs.kind.${doc.kind}` as CopyKey);
            return (
              <li key={doc.id} className="sp-panel flex items-center gap-3 p-2">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!href}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <DocThumb
                    doc={doc}
                    url={doc.thumb_path ? thumbs.data?.[doc.thumb_path] : undefined}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{name}</span>
                    <span className="block text-[13px] text-ink-muted">
                      {doc.title ? `${t(`docs.kind.${doc.kind}` as CopyKey)} · ` : ''}
                      {mediumDate(doc.created_at.slice(0, 10), today)} ·{' '}
                      {formatBytes(doc.size_bytes)}
                    </span>
                  </span>
                </a>
                {confirming === doc.id ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setConfirming(null);
                      void remove(doc);
                    }}
                  >
                    {t('docs.confirmDelete')}
                  </Button>
                ) : (
                  <IconButton
                    icon="trash"
                    label={t('docs.delete', { name })}
                    onClick={() => setConfirming(doc.id)}
                    className="text-ink-muted"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Button variant="secondary" icon="plus" className="mt-3" onClick={() => setAdding(true)}>
        {t('docs.add')}
      </Button>
      <UploadSheet
        open={adding}
        onClose={() => setAdding(false)}
        itemId={itemId}
        planId={planId}
        initialKind={planId ? 'other' : 'receipt'}
      />
    </>
  );
}

/** Pick a kind, then take a photo or choose a file. Uploading starts right away. */
export function UploadSheet({
  open,
  onClose,
  itemId,
  planId = null,
  initialKind = 'receipt',
}: {
  open: boolean;
  onClose: () => void;
  itemId: string | null;
  planId?: string | null;
  initialKind?: DocKind;
}) {
  const t = useCopy();
  const toast = useToast();
  const { upload } = useDocumentMutations();
  const [kind, setKind] = useState<DocKind>(initialKind);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      await upload({ itemId, planId, kind, title: title || null, file });
      toast.show({ message: t('docs.uploaded'), tone: 'success' });
      setTitle('');
      onClose();
    } catch (e) {
      const reason = e instanceof UploadError ? e.reason : 'failed';
      toast.show({ message: t(`docs.error.${reason}` as CopyKey), tone: 'danger' });
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('docs.add')} description={t('docs.addBody')}>
      <div className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-1.5 px-0.5 text-sm font-bold">{t('docs.kindLabel')}</legend>
          <div className="flex flex-wrap gap-2">
            {DOC_KINDS.map((k) => (
              <Chip key={k} selected={kind === k} onClick={() => setKind(k)}>
                {t(`docs.kind.${k}` as CopyKey)}
              </Chip>
            ))}
          </div>
        </fieldset>
        <TextField
          label={t('docs.title')}
          hint={t('common.optional')}
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button icon="scan" loading={busy} onClick={() => cameraRef.current?.click()}>
            {t('docs.takePhoto')}
          </Button>
          <Button
            variant="secondary"
            icon="archive"
            loading={busy}
            onClick={() => fileRef.current?.click()}
          >
            {t('docs.chooseFile')}
          </Button>
        </div>
        <p className="text-sm text-ink-muted">{t('docs.limits')}</p>
      </div>
    </Sheet>
  );
}
