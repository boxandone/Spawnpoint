import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useCopy } from '@/theme';
import { Icon } from './Icon';

export interface ToastInput {
  message: string;
  /** Shows an Undo button. Called at most once. */
  onUndo?: () => void | Promise<void>;
  tone?: 'default' | 'success' | 'danger';
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
  duration: number;
}

interface ToastApi {
  show: (toast: ToastInput) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Undo toasts stay 6 seconds (docs/SPEC.md 4.3). */
export const UNDO_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    const duration = input.duration ?? (input.onUndo ? UNDO_MS : 3500);
    // Keep the stack short on a phone: newest three.
    setToasts((list) => [...list.slice(-2), { ...input, id, duration }]);
    return id;
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(148px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <ToastView key={t.id} toast={t} onDone={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDone }: { toast: ToastItem; onDone: () => void }) {
  const t = useCopy();
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);
  const started = useRef(Date.now());
  const undone = useRef(false);

  useEffect(() => {
    if (paused) return;
    started.current = Date.now();
    const timer = setTimeout(onDone, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started.current;
    };
  }, [paused, onDone]);

  const tone =
    toast.tone === 'danger'
      ? 'bg-danger text-on-danger'
      : toast.tone === 'success'
        ? 'bg-success text-on-success'
        : 'bg-ink text-bg';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-theme shadow-card [animation:sp-toast-in_180ms_ease-out] ${tone}`}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex min-h-[52px] items-center gap-3 py-2 pl-4 pr-2">
        <p className="min-w-0 flex-1 text-[15px] font-semibold">{toast.message}</p>
        {toast.onUndo && (
          <button
            type="button"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 font-display text-sm font-extrabold underline-offset-2 hover:underline focus-visible:outline-current"
            onClick={() => {
              if (undone.current) return;
              undone.current = true;
              void toast.onUndo?.();
              onDone();
            }}
          >
            <Icon name="undo" size={18} />
            {t('common.undo')}
          </button>
        )}
      </div>
      {toast.onUndo && (
        <div
          className="absolute inset-x-0 bottom-0 h-1 origin-left bg-current opacity-40"
          style={{
            animation: `sp-toast-timer ${toast.duration}ms linear forwards`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
          aria-hidden
        />
      )}
    </div>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside ToastProvider');
  return api;
}
