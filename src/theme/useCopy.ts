import { useCallback, useContext } from 'react';
import { ScopeContext } from './context';
import { translate, type CopyKey, type CopyVars } from './copy';

export type Translate = (key: CopyKey, vars?: CopyVars) => string;

/** Every user-facing word goes through this: useCopy()('task.complete'). */
export function useCopy(): Translate {
  const { pack } = useContext(ScopeContext);
  return useCallback((key, vars) => translate(pack.copy, key, vars), [pack]);
}
