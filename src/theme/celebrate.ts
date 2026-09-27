import { useCallback, useContext } from 'react';
import { ScopeContext } from './context';
import type { CelebrationEvent } from './types';

const LAYER_ID = 'sp-celebrate';

function layer(): HTMLElement {
  let el = document.getElementById(LAYER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = LAYER_ID;
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '80',
      overflow: 'hidden',
    });
    document.body.appendChild(el);
  }
  return el;
}

export function prefersReducedMotion(): boolean {
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export interface CelebrateOptions {
  /** Element the effect starts from; also the source of theme colors. */
  from?: HTMLElement | null;
  /** Text for effects that show words ("Charged!"). */
  text?: string;
}

/** Plays the active pack's celebration, or its reduced-motion version. */
export function useCelebrate() {
  const { pack } = useContext(ScopeContext);
  return useCallback(
    (event: CelebrationEvent, opts: CelebrateOptions = {}) => {
      if (typeof document === 'undefined') return;
      const from = opts.from ?? null;
      const rect = from?.getBoundingClientRect();
      const origin = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const scope =
        (from?.closest('[data-app-theme]') as HTMLElement | null) ?? document.documentElement;
      const effect = pack.celebrate[event];
      const ctx = { layer: layer(), origin, target: from, scope, text: opts.text };
      try {
        if (prefersReducedMotion()) effect.reduced(ctx);
        else effect.full(ctx);
      } catch {
        /* a celebration must never break the action it celebrates */
      }
    },
    [pack],
  );
}
