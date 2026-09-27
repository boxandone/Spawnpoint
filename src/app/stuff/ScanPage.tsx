import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, PageHeader, Panel } from '@/components/ui';
import { useLocations } from '@/modules/locations/hooks';
import { locationLabel } from '@/modules/locations/logic';
import type { Item } from '@/modules/stuff/api';
import { useItems } from '@/modules/stuff/hooks';
import { parseScan } from '@/modules/stuff/logic';
import { useCopy } from '@/theme';
import { ItemRowLink } from './ItemRowLink';

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (opts: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
}

const FORMATS = ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

type CameraState = 'starting' | 'on' | 'denied' | 'none';

/**
 * Scan: our QR labels open the item or place; product barcodes are matched
 * against Stuff. Uses the browser's detector when there is one, and a
 * JavaScript reader otherwise (loaded only then). Nothing leaves the device.
 */
export function ScanPage() {
  const t = useCopy();
  const navigate = useNavigate();
  const items = useItems();
  const { locations } = useLocations();
  const videoRef = useRef<HTMLVideoElement>(null);
  const handled = useRef(false);
  const [camera, setCamera] = useState<CameraState>('starting');
  const [manual, setManual] = useState('');
  const [matches, setMatches] = useState<Item[] | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [notOurs, setNotOurs] = useState(false);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items.data ?? [];

  const handle = useCallback(
    (text: string) => {
      if (handled.current) return;
      const result = parseScan(text);
      if (result.kind === 'code') {
        handled.current = true;
        navigate(`/s/${result.code}`);
        return;
      }
      if (result.kind === 'barcode') {
        handled.current = true;
        const found = itemsRef.current.filter(
          (i) => !i.archived_at && i.barcode?.toLowerCase() === result.value.toLowerCase(),
        );
        if (found.length === 1) navigate(`/stuff/${(found[0] as Item).id}`);
        else if (found.length > 1) setMatches(found);
        else setMissing(result.value);
        return;
      }
      setNotOurs(true);
    },
    [navigate],
  );

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let stopReader: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera('none');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
      } catch (e) {
        setCamera(e instanceof DOMException && e.name === 'NotAllowedError' ? 'denied' : 'none');
        return;
      }
      if (stopped || !videoRef.current) return;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      setCamera('on');

      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
        .BarcodeDetector;
      if (Detector) {
        const supported = await Detector.getSupportedFormats().catch(() => [] as string[]);
        const detector = new Detector({ formats: FORMATS.filter((f) => supported.includes(f)) });
        const tick = async () => {
          if (stopped) return;
          try {
            const found = await detector.detect(video);
            const first = found[0];
            if (first?.rawValue) handle(first.rawValue);
          } catch {
            /* frame not ready */
          }
          timer = setTimeout(() => void tick(), 250);
        };
        void tick();
      } else {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (stopped || !stream) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromStream(stream, video, (result) => {
          if (result) handle(result.getText());
        });
        stopReader = () => controls.stop();
      }
    };
    void start();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stopReader?.();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [handle]);

  useEffect(() => {
    if (!notOurs) return;
    const id = setTimeout(() => setNotOurs(false), 2500);
    return () => clearTimeout(id);
  }, [notOurs]);

  const reset = () => {
    handled.current = false;
    setMatches(null);
    setMissing(null);
  };

  const submitManual = (e: FormEvent) => {
    e.preventDefault();
    if (manual.trim()) {
      handled.current = false;
      handle(manual.trim());
    }
  };

  return (
    <div className="pb-8">
      <PageHeader title={t('scan.title')} subtitle={t('scan.body')} back />
      <div className="relative mb-3 aspect-[3/4] w-full overflow-hidden rounded-theme bg-ink">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {camera === 'on' && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[18%] rounded-theme shadow-[0_0_0_4px_var(--primary),0_0_0_999px_rgba(0,0,0,0.35)]"
          />
        )}
        {camera !== 'on' && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-bg">
            <p>
              {camera === 'starting'
                ? t('scan.starting')
                : camera === 'denied'
                  ? t('scan.denied')
                  : t('scan.noCamera')}
            </p>
          </div>
        )}
      </div>

      <p role="status" aria-live="polite" className="min-h-[1.5rem] text-center text-sm font-bold">
        {notOurs ? t('scan.notOurs') : ''}
      </p>

      {matches && (
        <Panel className="mb-3">
          <p className="mb-2 font-bold">{t('scan.several')}</p>
          <ul className="flex flex-col gap-2">
            {matches.map((i) => (
              <ItemRowLink key={i.id} item={i} place={locationLabel(i.location_id, locations)} />
            ))}
          </ul>
          <Button variant="ghost" className="mt-2" onClick={reset}>
            {t('scan.again')}
          </Button>
        </Panel>
      )}
      {missing && (
        <Panel className="mb-3 flex flex-col gap-2">
          <p className="font-bold">{t('scan.noMatch')}</p>
          <p className="font-mono text-sm">{missing}</p>
          <div className="flex gap-2">
            <Button
              icon="plus"
              onClick={() => navigate(`/stuff/new?barcode=${encodeURIComponent(missing)}`)}
            >
              {t('scan.addWithBarcode')}
            </Button>
            <Button variant="ghost" onClick={reset}>
              {t('scan.again')}
            </Button>
          </div>
        </Panel>
      )}

      <form onSubmit={submitManual} className="flex gap-2">
        <label htmlFor="scan-manual" className="sr-only">
          {t('scan.manual')}
        </label>
        <input
          id="scan-manual"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder={t('scan.manual')}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={80}
          className="sp-input min-h-[48px] flex-1"
        />
        <button
          type="submit"
          aria-label={t('scan.go')}
          className="sp-btn sp-btn-secondary grid min-h-[48px] w-12 place-items-center px-0"
        >
          <Icon name="chevron" size={20} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
