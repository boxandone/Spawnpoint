import { createContext } from 'react';
import { classic } from './themes/classic';
import type { ModePreference, ThemeMode, ThemePack } from './types';

export interface ScopeValue {
  pack: ThemePack;
  mode: ThemeMode;
}

export const ScopeContext = createContext<ScopeValue>({ pack: classic, mode: 'light' });

export interface RootThemeValue {
  themeId: string;
  modePreference: ModePreference;
  mode: ThemeMode;
  setThemeId: (id: string) => void;
  setModePreference: (mode: ModePreference) => void;
}

export const RootThemeContext = createContext<RootThemeValue | null>(null);
