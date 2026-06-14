// lib/story/personal-theme.ts
//
// Shared dark-forest design tokens for Tredoux's personal platform
// (diary / planner / projects / coach). Calm, warm sanctuary — Lora serif
// headings, Inter body, generous spacing. Mirrors the Story-admin login +
// Montree cockpit palette.

import type { CSSProperties } from 'react';

export const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.30), transparent 60%)',
  card: 'rgba(8,20,12,0.55)',
  cardSolid: 'rgba(10,24,15,0.92)',
  border: 'rgba(52,211,153,0.18)',
  borderSoft: 'rgba(255,255,255,0.08)',
  emerald: '#34d399',
  emeraldDeep: '#1D6B48',
  gold: '#E8C96A',
  text: 'rgba(255,255,255,0.95)',
  textMid: 'rgba(255,255,255,0.62)',
  textDim: 'rgba(255,255,255,0.42)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  column: 680,
} as const;

export const cardStyle: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 18,
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
};
