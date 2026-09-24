import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B1120',
        'ink-muted': '#1a2332',
        'ink-subtle': '#334155',
        surface: '#FAFBFC',
        'surface-raised': '#FFFFFF',
        'surface-sunken': '#F1F5F9',
        royal: '#003594',
        medium: '#00205B',
        gold: '#FFB81C',
        'gold-lt': '#FFF8E1',
        mist: '#E2E8F0',
        slate: '#64748B',
        bronze: '#B87333',
        'bronze-lt': '#FEF6EC',
        pgreen: '#00AD6E',
        'pgreen-lt': '#E6F9F2',
        pred: '#CC3B2B',
        'pred-lt': '#FDECEA',
        pblue: '#1D4ED8',
        'pblue-lt': '#E8F0FF',
        'card-dark': '#151D2E',
        'border-dark': '#1E293B',
        'surface-raised-dark': '#1A2332',
        'surface-sunken-dark': '#0D1420',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        reading: ['1rem', { lineHeight: '1.7' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease',
        'slide-in': 'slideIn 0.25s ease',
        'slide-out': 'slideOut 0.25s ease forwards',
        'pill-in': 'pillIn 0.3s ease both',
        spin: 'spin 0.8s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideOut: {
          from: { transform: 'translateX(0)', opacity: '1' },
          to: { transform: 'translateX(100%)', opacity: '0' },
        },
        pillIn: {
          from: { opacity: '0', transform: 'scale(0.8)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
    },
  },
  plugins: [],
} satisfies Config
