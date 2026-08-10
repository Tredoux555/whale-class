import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'whale-blue': '#4A90E2',
        'whale-dark': '#2C5F7C',
        'whale-light': '#B8E0F0',
        accent: '#FFB84D',

        // ── Montree "Dark Forest" palette (MONTREE_BRAND_PALETTE.md) ──
        // Added alongside the legacy whale tokens — nothing above removed.
        // Mirrors the @theme block in app/globals.css.
        'forest-bg': '#0A1A0F',
        'forest-card': '#08140C',
        'forest-deep': '#03261D',
        'forest-line': 'rgba(52,211,153,0.20)',
        'emerald-primary': '#34D399',
        'emerald-deep': '#1D6B48',
        'emerald-press': '#17553A',
        'forest-gold': '#E8C96A',
        'forest-gold-deep': '#B9974A',
        'forest-danger': '#F87171',
        'forest-danger-deep': '#B4322F',
        'forest-text': '#E8F0EA',
        'forest-muted': '#9FC7B0',
        'forest-ink': '#06140C',
      },
      backgroundImage: {
        'cta-forest': 'linear-gradient(135deg, #34D399 0%, #1D6B48 100%)',
        'cta-gold': 'linear-gradient(135deg, #F2DA92 0%, #C8A44F 100%)',
      },
      boxShadow: {
        // "Soft Elevation": ONE soft directional shadow per hue, negative
        // spread. Mirrors --mt-sh-* in app/globals.css.
        'forest-emerald': '0 6px 18px -8px rgba(29,107,72,0.95)',
        'forest-neutral': '0 4px 14px -8px rgba(0,0,0,0.9)',
        'forest-danger': '0 6px 18px -8px rgba(180,50,47,0.95)',
        'forest-gold': '0 6px 18px -8px rgba(185,151,74,0.9)',
      },
      borderRadius: {
        btn: '10px',
        'btn-sm': '8px',
        'btn-lg': '12px',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
