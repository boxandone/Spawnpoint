/**
 * Small DOM effects shared by theme celebrations. Every effect draws into the
 * celebration layer, reads colors from the scope's CSS variables, and cleans up
 * after itself. Nothing here runs under reduced motion except the `fade*` helpers,
 * which only change opacity.
 */
import type { CelebrationContext } from './types';

type Ctx = CelebrationContext;

export function cssVar(scope: HTMLElement, name: string): string {
  return getComputedStyle(scope).getPropertyValue(name).trim();
}

function canAnimate(el: HTMLElement): boolean {
  return typeof el.animate === 'function';
}

function place(ctx: Ctx, el: HTMLElement, x = ctx.origin.x, y = ctx.origin.y) {
  el.style.position = 'fixed';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.pointerEvents = 'none';
  ctx.layer.appendChild(el);
  return el;
}

function run(el: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) {
  if (!canAnimate(el)) {
    el.remove();
    return;
  }
  const anim = el.animate(frames, { fill: 'forwards', ...options });
  anim.onfinish = () => el.remove();
  anim.oncancel = () => el.remove();
}

export interface ConfettiOptions {
  colors?: string[];
  count?: number;
  shape?: 'rect' | 'circle' | 'chevron' | 'square';
  spread?: number;
  duration?: number;
}

export function confetti(ctx: Ctx, opts: ConfettiOptions = {}) {
  const colors = opts.colors ?? [
    cssVar(ctx.scope, '--primary'),
    cssVar(ctx.scope, '--secondary'),
    cssVar(ctx.scope, '--accent'),
  ];
  const count = opts.count ?? 22;
  const spread = opts.spread ?? 110;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    const size = 5 + Math.random() * 5;
    const color = colors[i % colors.length] ?? 'currentColor';
    p.style.width = `${size}px`;
    p.style.height = `${opts.shape === 'rect' ? size * 0.5 : size}px`;
    p.style.background = color;
    p.style.borderRadius = opts.shape === 'circle' ? '50%' : '1px';
    if (opts.shape === 'chevron') {
      p.style.background = 'none';
      p.style.width = `${size + 4}px`;
      p.style.height = `${size + 4}px`;
      p.style.borderTop = `3px solid ${color}`;
      p.style.borderRight = `3px solid ${color}`;
    }
    place(ctx, p);
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = spread * (0.5 + Math.random() * 0.6);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 30;
    const rot = (Math.random() - 0.5) * 540;
    run(
      p,
      [
        { transform: 'translate(-50%, -50%) rotate(0deg) scale(1)', opacity: 1 },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rot}deg) scale(1)`,
          opacity: 1,
          offset: 0.7,
        },
        {
          transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + 40}px)) rotate(${rot * 1.2}deg) scale(0.6)`,
          opacity: 0,
        },
      ],
      { duration: opts.duration ?? 900, easing: 'cubic-bezier(.2,.7,.3,1)' },
    );
  }
}

/** Radial light rays spinning behind the origin. */
export function rays(ctx: Ctx, color = cssVar(ctx.scope, '--accent'), size = 260) {
  const el = document.createElement('div');
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = '50%';
  el.style.background = `repeating-conic-gradient(from 0deg, ${color} 0deg 10deg, transparent 10deg 30deg)`;
  el.style.maskImage = 'radial-gradient(circle, black 20%, transparent 70%)';
  el.style.webkitMaskImage = 'radial-gradient(circle, black 20%, transparent 70%)';
  place(ctx, el);
  run(
    el,
    [
      { transform: 'translate(-50%, -50%) scale(0.3) rotate(0deg)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1) rotate(40deg)', opacity: 0.85, offset: 0.3 },
      { transform: 'translate(-50%, -50%) scale(1.1) rotate(120deg)', opacity: 0 },
    ],
    { duration: 1300, easing: 'ease-out' },
  );
}

function textBadge(ctx: Ctx, text: string) {
  const el = document.createElement('div');
  el.textContent = text;
  el.setAttribute('role', 'status');
  el.style.font = `800 34px/1 ${cssVar(ctx.scope, '--font-display') || 'sans-serif'}`;
  el.style.textTransform = cssVar(ctx.scope, '--display-transform') || 'none';
  el.style.letterSpacing = cssVar(ctx.scope, '--display-tracking') || 'normal';
  el.style.color = cssVar(ctx.scope, '--primary-ink');
  el.style.background = cssVar(ctx.scope, '--primary');
  el.style.padding = '12px 22px';
  el.style.borderRadius = cssVar(ctx.scope, '--radius') || '14px';
  el.style.whiteSpace = 'nowrap';
  el.style.boxShadow = '0 10px 30px rgba(0,0,0,.25)';
  return el;
}

/** Big text that slams in, holds, and fades out. */
export function slamText(ctx: Ctx, text: string, at?: { x: number; y: number }) {
  const el = textBadge(ctx, text);
  place(ctx, el, at?.x ?? window.innerWidth / 2, at?.y ?? window.innerHeight * 0.38);
  run(
    el,
    [
      { transform: 'translate(-50%, -50%) scale(2.4) skewX(-8deg)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(0.94) skewX(-8deg)', opacity: 1, offset: 0.18 },
      { transform: 'translate(-50%, -50%) scale(1) skewX(-8deg)', opacity: 1, offset: 0.28 },
      { transform: 'translate(-50%, -50%) scale(1) skewX(-8deg)', opacity: 1, offset: 0.8 },
      { transform: 'translate(-50%, -50%) scale(1.05) skewX(-8deg)', opacity: 0 },
    ],
    { duration: 1500, easing: 'ease-out' },
  );
}

/** Gentle pop-up text used by calm themes. */
export function floatText(ctx: Ctx, text: string, at?: { x: number; y: number }) {
  const el = textBadge(ctx, text);
  el.style.fontSize = '24px';
  place(ctx, el, at?.x ?? window.innerWidth / 2, at?.y ?? window.innerHeight * 0.38);
  run(
    el,
    [
      { transform: 'translate(-50%, -30%) scale(0.9)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.2 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.8 },
      { transform: 'translate(-50%, -70%) scale(1)', opacity: 0 },
    ],
    { duration: 1500, easing: 'ease-out' },
  );
}

/** Reduced-motion text: appears and disappears with opacity only. */
export function fadeText(ctx: Ctx, text: string) {
  const el = textBadge(ctx, text);
  el.style.fontSize = '22px';
  el.style.transform = 'translate(-50%, -50%)';
  place(ctx, el, window.innerWidth / 2, window.innerHeight * 0.38);
  run(
    el,
    [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }],
    {
      duration: 1400,
    },
  );
}

/** Reduced-motion tick: a check mark that fades in and out where you tapped. */
export function fadeCheck(ctx: Ctx) {
  const el = document.createElement('div');
  el.textContent = '✓';
  el.style.font = '800 28px/1 sans-serif';
  el.style.color = cssVar(ctx.scope, '--on-success');
  el.style.background = cssVar(ctx.scope, '--success');
  el.style.width = '44px';
  el.style.height = '44px';
  el.style.display = 'grid';
  el.style.placeItems = 'center';
  el.style.borderRadius = '50%';
  el.style.transform = 'translate(-50%, -50%)';
  place(ctx, el);
  run(el, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { duration: 700 });
}

/** Soft glow pulse around an element (the weekly meter). */
export function glow(target: HTMLElement | null | undefined, color: string, pulses = 2) {
  if (!target || !canAnimate(target)) return;
  target.animate(
    [
      { boxShadow: `0 0 0 0 ${color}` },
      { boxShadow: `0 0 0 10px transparent`, offset: 0.7 },
      { boxShadow: `0 0 0 0 transparent` },
    ],
    { duration: 900, iterations: pulses, easing: 'ease-out' },
  );
}

/** A tiny screen shake. Never used under reduced motion. */
export function shake(el: HTMLElement | null | undefined) {
  if (!el || !canAnimate(el)) return;
  el.animate(
    [
      { transform: 'translate(0, 0)' },
      { transform: 'translate(-4px, 2px)' },
      { transform: 'translate(4px, -2px)' },
      { transform: 'translate(-3px, -1px)' },
      { transform: 'translate(2px, 1px)' },
      { transform: 'translate(0, 0)' },
    ],
    { duration: 320, easing: 'ease-out' },
  );
}

/** A ring that expands from the origin. */
export function ring(ctx: Ctx, color = cssVar(ctx.scope, '--primary')) {
  const el = document.createElement('div');
  el.style.width = '24px';
  el.style.height = '24px';
  el.style.borderRadius = '50%';
  el.style.border = `3px solid ${color}`;
  place(ctx, el);
  run(
    el,
    [
      { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 1 },
      { transform: 'translate(-50%, -50%) scale(3.2)', opacity: 0 },
    ],
    { duration: 600, easing: 'ease-out' },
  );
}
