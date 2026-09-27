import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { RootThemeContext, ScopeContext, type RootThemeValue } from './context';
import { DEFAULT_THEME_ID, getPack, isThemeId } from './registry';
import type { ModePreference, ThemeMode } from './types';

const THEME_KEY = 'sp.theme';
const MODE_KEY = 'sp.mode';

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage may be blocked; the attribute still applies for this visit */
  }
}

function useSystemDark(): boolean {
  const query = '(prefers-color-scheme: dark)';
  const [dark, setDark] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const onChange = () => setDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return dark;
}

export function resolveMode(pref: ModePreference, systemDark: boolean): ThemeMode {
  if (pref === 'system') return systemDark ? 'dark' : 'light';
  return pref;
}

/**
 * Owns the <html> theme attributes. The household and member settings feed it
 * through setThemeId / setModePreference (see useApplyMemberTheme).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState(() => {
    const stored = readStorage(THEME_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME_ID;
  });
  const [modePreference, setModePrefState] = useState<ModePreference>(() => {
    const stored = readStorage(MODE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  });
  const systemDark = useSystemDark();
  const mode = resolveMode(modePreference, systemDark);
  const pack = getPack(themeId);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-app-theme', pack.id);
    root.setAttribute('data-theme', mode);
    root.style.setProperty('--texture', pack.patterns.background);
    const meta = document.querySelector('meta[name="theme-color"]');
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    if (meta && bg) meta.setAttribute('content', bg);
  }, [pack, mode]);

  const setThemeId = useCallback((id: string) => {
    const next = isThemeId(id) ? id : DEFAULT_THEME_ID;
    writeStorage(THEME_KEY, next);
    setThemeIdState(next);
  }, []);

  const setModePreference = useCallback((pref: ModePreference) => {
    writeStorage(MODE_KEY, pref);
    setModePrefState(pref);
  }, []);

  const root = useMemo<RootThemeValue>(
    () => ({ themeId: pack.id, modePreference, mode, setThemeId, setModePreference }),
    [pack.id, modePreference, mode, setThemeId, setModePreference],
  );
  const scope = useMemo(() => ({ pack, mode }), [pack, mode]);

  return (
    <RootThemeContext.Provider value={root}>
      <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>
    </RootThemeContext.Provider>
  );
}

export function useRootTheme(): RootThemeValue {
  const value = useContext(RootThemeContext);
  if (!value) throw new Error('useRootTheme must be used inside ThemeProvider');
  return value;
}

/** The pack and mode that apply where this component renders. */
export function useThemeScope() {
  return useContext(ScopeContext);
}

export function usePack() {
  return useContext(ScopeContext).pack;
}

interface ThemeScopeProps {
  themeId: string;
  mode: ThemeMode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Marks previews so they can be skipped by screen readers when they duplicate real content. */
  'aria-hidden'?: boolean;
}

/**
 * Applies a theme and mode to a subtree. Gallery tiles and styleguide previews
 * use this to show several themes on one page.
 */
export function ThemeScope({
  themeId,
  mode,
  children,
  className,
  style,
  ...rest
}: ThemeScopeProps) {
  const pack = getPack(themeId);
  const value = useMemo(() => ({ pack, mode }), [pack, mode]);
  return (
    <ScopeContext.Provider value={value}>
      <div
        data-app-theme={pack.id}
        data-theme={mode}
        className={className}
        style={{ ['--texture' as string]: pack.patterns.background, ...style }}
        {...rest}
      >
        {children}
      </div>
    </ScopeContext.Provider>
  );
}
