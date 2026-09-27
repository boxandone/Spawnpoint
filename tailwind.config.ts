import type { Config } from 'tailwindcss';

/** A token color that still supports Tailwind opacity modifiers (bg-primary/20). */
const token = (name: string) =>
  `color-mix(in srgb, var(--${name}) calc(<alpha-value> * 100%), transparent)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        ink: token('ink'),
        'ink-muted': token('ink-muted'),
        line: token('line'),
        primary: token('primary'),
        'primary-ink': token('primary-ink'),
        secondary: token('secondary'),
        'on-secondary': token('on-secondary'),
        accent: token('accent'),
        'on-accent': token('on-accent'),
        success: token('success'),
        'on-success': token('on-success'),
        warning: token('warning'),
        'on-warning': token('on-warning'),
        danger: token('danger'),
        'on-danger': token('on-danger'),
      },
      borderRadius: {
        theme: 'var(--radius)',
        'theme-sm': 'calc(var(--radius) * 0.6)',
        'theme-lg': 'calc(var(--radius) * 1.4)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        num: 'var(--font-num)',
      },
      boxShadow: {
        press: 'var(--shadow-press)',
        card: 'var(--shadow-card)',
      },
      borderColor: {
        DEFAULT: 'var(--line)',
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
} satisfies Config;
