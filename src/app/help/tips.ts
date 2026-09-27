import { useCallback, useSyncExternalStore } from 'react';

/**
 * Guide mode: small, dismissible tips. Remembered per device (a convenience,
 * not household data). On by default so new people see them.
 */
const GUIDE_KEY = 'sp.guide';
const DISMISSED_KEY = 'sp.tips.dismissed';
const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage blocked: tips just reset next visit */
  }
  listeners.forEach((l) => l());
}

function snapshot(): string {
  return `${read(GUIDE_KEY) ?? 'on'}|${read(DISMISSED_KEY) ?? '[]'}`;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function parseDismissed(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function useGuide() {
  const snap = useSyncExternalStore(subscribe, snapshot, () => 'on|[]');
  const [mode, raw] = [snap.slice(0, snap.indexOf('|')), snap.slice(snap.indexOf('|') + 1)];
  const dismissed = parseDismissed(raw);
  const enabled = mode !== 'off';

  const setEnabled = useCallback((on: boolean) => write(GUIDE_KEY, on ? 'on' : 'off'), []);
  const dismiss = useCallback((id: string) => {
    const list = parseDismissed(read(DISMISSED_KEY) ?? '[]');
    if (!list.includes(id)) write(DISMISSED_KEY, JSON.stringify([...list, id]));
  }, []);
  const resetAll = useCallback(() => {
    write(DISMISSED_KEY, null);
    write(GUIDE_KEY, 'on');
  }, []);

  return {
    enabled,
    setEnabled,
    dismiss,
    resetAll,
    isVisible: (id: string) => enabled && !dismissed.includes(id),
  };
}
