const token = (name) => `oklch(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        rail: token('rail'),
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        subtle: token('subtle'),
        accent: {
          DEFAULT: token('accent'),
          strong: token('accent-strong'),
          soft: token('accent-soft'),
          ink: token('accent-ink'),
        },
        positive: { DEFAULT: token('positive'), soft: token('positive-soft') },
        caution: { DEFAULT: token('caution'), soft: token('caution-soft') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
      },
      fontFamily: {
        sans: [
          '"Geist Variable"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'system-ui',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        panel: '0 1px 2px oklch(var(--shadow) / 0.06)',
        pop: '0 8px 24px oklch(var(--shadow) / 0.14)',
      },
    },
  },
  plugins: [],
};
