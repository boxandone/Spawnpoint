import { confetti, cssVar, fadeCheck, fadeText, rays, ring, shake, slamText } from '../../fx';
import type { CelebrationSet } from '../../types';

const screen = () => document.getElementById('root');

export const celebrate: CelebrationSet = {
  taskComplete: {
    full: (ctx) => {
      ring(ctx, cssVar(ctx.scope, '--secondary'));
      confetti(ctx, { count: 14, spread: 90, shape: 'chevron' });
    },
    reduced: (ctx) => fadeCheck(ctx),
  },
  badgeEarned: {
    full: (ctx) => {
      rays(ctx, cssVar(ctx.scope, '--accent'), 220);
      if (ctx.text) slamText(ctx, ctx.text);
    },
    reduced: (ctx) => ctx.text && fadeText(ctx, ctx.text),
  },
  levelUp: {
    full: (ctx) => {
      rays(ctx, cssVar(ctx.scope, '--primary'), 320);
      if (ctx.text) slamText(ctx, ctx.text);
      setTimeout(() => shake(screen()), 220);
    },
    reduced: (ctx) => ctx.text && fadeText(ctx, ctx.text),
  },
  meterFull: {
    full: (ctx) => {
      rays(ctx, cssVar(ctx.scope, '--accent'), 300);
      if (ctx.text) slamText(ctx, ctx.text);
      setTimeout(() => shake(screen()), 220);
    },
    reduced: (ctx) => ctx.text && fadeText(ctx, ctx.text),
  },
};
