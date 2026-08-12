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

        // ── CMS "Harbor" palette (protected brand — docs/design/CMS_DESIGN_SYSTEM.md) ──
        // ADDITIVE, exactly like the forest block above: no name here collides
        // with a whale-* or forest-* token, and nothing above was touched.
        // Mirrors the `harbor-*` @theme entries in the CMS section at the bottom
        // of app/globals.css (that block is what actually generates the
        // utilities under Tailwind v4 — if you change one, change both).
        'harbor-canvas': '#F1F5FA',
        'harbor-canvas-deep': '#E7EFF7',
        'harbor-surface': '#FFFFFF',
        'harbor-sunk': '#F5F8FC',
        'harbor-border': '#DCE4EF',
        'harbor-border-strong': '#C1D0E2',
        'harbor-accent': '#336FAF',
        'harbor-accent-hi': '#4A85C3',
        'harbor-accent-deep': '#245483',
        'harbor-accent-press': '#1D456B',
        'harbor-text': '#131C27',
        'harbor-muted': '#617082',
        'harbor-success': '#15916A',
        'harbor-danger': '#C9483F',
        'harbor-danger-deep': '#9E342D',
        'harbor-amber': '#C08A2A',
        'harbor-amber-deep': '#976A18',
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

        // CMS "Harbor" — same law, one soft directional fall per hue.
        'harbor-accent': '0 6px 16px -8px rgba(36,84,131,0.75)',
        'harbor-neutral': '0 4px 12px -8px rgba(21,38,60,0.55)',
        'harbor-danger': '0 6px 16px -8px rgba(158,52,45,0.70)',
        'harbor-amber': '0 6px 16px -8px rgba(151,106,24,0.70)',
        'harbor-card': '0 1px 2px rgba(21,38,60,0.04), 0 10px 26px -20px rgba(21,38,60,0.35)',
      },
      borderRadius: {
        btn: '10px',
        'btn-sm': '8px',
        'btn-lg': '12px',
      },
      fontFamily: {
        // CMS "Harbor" type pairing. Set as CSS variables by next/font in
        // app/cms/layout.tsx under CMS-only names, so the root layout's
        // --font-inter / --font-lora are never shadowed. Additive: Tailwind's
        // own sans/serif/mono defaults are untouched.
        head: ['var(--font-cms-head)', 'Georgia', 'serif'],
        body: ['var(--font-cms-body)', 'system-ui', 'sans-serif'],
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
