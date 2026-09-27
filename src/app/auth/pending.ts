/**
 * Where to go after Google sign-in, and any invite code in flight. Kept in
 * sessionStorage so it survives the OAuth redirect but not the browser session.
 */
const PATH_KEY = 'sp.pendingPath';
const START_KEY = 'sp.startCode';

function get(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export const pending = {
  path: () => get(PATH_KEY),
  setPath: (path: string | null) => set(PATH_KEY, path),
  takePath: () => {
    const p = get(PATH_KEY);
    set(PATH_KEY, null);
    return p;
  },
  startCode: () => get(START_KEY),
  setStartCode: (code: string | null) => set(START_KEY, code),
};

/** Pull an invite code out of a pasted link or a bare code. */
export function parseInvite(
  input: string,
): { kind: 'start' | 'join' | 'unknown'; code: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = /\/(start|join)\/([0-9A-Za-z-]+)/.exec(trimmed);
  if (match)
    return { kind: match[1] as 'start' | 'join', code: (match[2] as string).toUpperCase() };
  const bare = trimmed.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  return bare.length >= 8 ? { kind: 'unknown', code: bare } : null;
}
