import { confetti, cssVar, fadeCheck, fadeText, floatText, glow, ring } from '../../fx';
import type { CelebrationSet } from '../../types';

export const celebrate: CelebrationSet = {
  taskComplete: {
    full: (ctx) => {
      ring(ctx);
      confetti(ctx, { count: 16, spread: 80, shape: 'circle' });
    },
    reduced: (ctx) => fadeCheck(ctx),
  },
  badgeEarned: {
    full: (ctx) => {
      confetti(ctx, { count: 28, spread: 140 });
      if (ctx.text) floatText(ctx, ctx.text);
    },
    reduced: (ctx) => ctx.text && fadeText(ctx, ctx.text),
  },
  levelUp: {
    full: (ctx) => {
      confetti(ctx, { count: 36, spread: 170, shape: 'rect' });
      if (ctx.text) floatText(ctx, ctx.text);
    },
    reduced: (ctx) => ctx.text && fadeText(ctx, ctx.text),
  },
  meterFull: {
    full: (ctx) => {
      glow(ctx.target, cssVar(ctx.scope, '--accent'), 3);
      confetti(ctx, { count: 20, spread: 120, shape: 'circle' });
      if (ctx.text) floatText(ctx, ctx.text);
    },
    reduced: (ctx) => ctx.text && fadeText(ctx, ctx.text),
  },
};
