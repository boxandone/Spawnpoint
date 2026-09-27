import { useCallback, useSyncExternalStore } from 'react';
import { compareVersions, LATEST } from './releases';

// Per-device convenience: which release notes this browser has seen.
const KEY = 'sp.seenRelease';
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** True when there are release notes newer than the last ones opened on this device. */
export function useUnseenUpdate(): { unseen: boolean; markSeen: () => void } {
  const seen = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => null,
  );
  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(KEY, LATEST.version);
    } catch {
      /* storage blocked: the dot just stays until next time */
    }
    listeners.forEach((l) => l());
  }, []);
  return { unseen: seen === null || compareVersions(LATEST.version, seen) > 0, markSeen };
}
