// app/montree/dashboard/tracker/components/theme.ts
//
// The dark forest palette (MONTREE_BRAND_PALETTE.md), as the tracker uses it.
// Held here rather than inline so the grid, the child page and the health panel
// cannot drift apart.
//
// TWO DELIBERATE ABSENCES, both from the constitution's spirit rather than a
// style guide: no emoji is ever used as a control or a status, and there is no
// star, badge, trophy or reward imagery anywhere in these screens. A child's
// row turning gold is a statement of fact (the letter's five works are
// mastered), not a prize.

import type { CSSProperties } from 'react';
import type { Status } from './types';

export const T = {
  bg: '#0A1A0F',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 6%, rgba(39,129,90,0.34), transparent 62%)',
  card: 'rgba(8,20,12,0.55)',
  cardSolid: '#08140C',
  border: '1px solid rgba(52,211,153,0.20)',
  borderSoft: '1px solid rgba(255,255,255,0.08)',
  emerald: '#34D399',
  emeraldDeep: '#1D6B48',
  gold: '#E8C96A',
  danger: '#F87171',
  text: '#E8F0EA',
  muted: '#9FC7B0',
  faint: 'rgba(255,255,255,0.38)',
  onEmerald: '#06140C',
  serif: 'var(--font-lora), Lora, Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
} as const;

/** Tablet-first hit target. Nothing tappable is smaller than this. */
export const TAP = 52;

/** How a work cell reads at each rung. Colour AND text — never colour alone. */
export const STATUS_STYLE: Record<Status, CSSProperties> = {
  not_started: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: 'rgba(255,255,255,0.45)',
  },
  presented: {
    background: 'rgba(52,211,153,0.10)',
    border: '1px solid rgba(52,211,153,0.30)',
    color: '#9FC7B0',
  },
  practicing: {
    background: 'rgba(52,211,153,0.22)',
    border: '1px solid rgba(52,211,153,0.55)',
    color: '#E8F0EA',
  },
  mastered: {
    background: 'rgba(232,201,106,0.20)',
    border: '1px solid rgba(232,201,106,0.60)',
    color: '#E8C96A',
  },
};

/** The ribbon's four states (derive.ts RibbonState). */
export const RIBBON_STYLE: Record<string, CSSProperties> = {
  mastered: { background: 'rgba(232,201,106,0.85)', color: '#1a1405', border: '1px solid rgba(232,201,106,0.9)' },
  'in-progress': { background: 'rgba(52,211,153,0.75)', color: '#06140C', border: '1px solid rgba(52,211,153,0.8)' },
  'not-started': { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.12)' },
  coming: { background: 'transparent', color: 'rgba(255,255,255,0.30)', border: '1px dashed rgba(255,255,255,0.22)' },
};

export const cardStyle: CSSProperties = {
  background: T.card,
  border: T.border,
  borderRadius: 14,
  padding: 16,
};

export const ghostBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minHeight: 44,
  padding: '10px 16px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: T.text,
  fontFamily: T.sans,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

export const ctaBtn: CSSProperties = {
  ...ghostBtn,
  background: 'linear-gradient(135deg, #34D399, #1D6B48)',
  border: '1px solid rgba(52,211,153,0.55)',
  color: T.onEmerald,
  fontWeight: 700,
};
