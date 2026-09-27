import { classicCopy, type CopyDict, type CopyKey } from './themes/classic/copy';

export type { CopyDict, CopyKey };
export const baseCopy: CopyDict = classicCopy;

export type CopyVars = Record<string, string | number>;

/** Look up a key in a pack's overrides, falling back to Classic, then fill {vars}. */
export function translate(overrides: Partial<CopyDict>, key: CopyKey, vars?: CopyVars): string {
  const template = overrides[key] ?? baseCopy[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
