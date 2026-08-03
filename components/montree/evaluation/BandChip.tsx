'use client';

/**
 * The band chip — Emerging / Developing / Secure / Not looked at this time.
 *
 * Three bands and an honest fourth state. "Not looked at this time" is a first-class chip
 * on purpose: a milestone without enough evidence is reported as unassessed, never
 * silently dropped and never guessed down to Emerging (ARCHITECTURE.md §2.2).
 */
import { BAND_STYLE, BAND_STYLE_DARK, SANS } from './tokens';

export type BandValue = 'secure' | 'developing' | 'emerging' | 'unassessed' | string;

export function BandChip({
  band,
  label,
  dark = false,
  size = 'md',
}: {
  band: BandValue;
  label: string;
  dark?: boolean;
  size?: 'sm' | 'md';
}) {
  const style = (dark ? BAND_STYLE_DARK : BAND_STYLE)[band] ?? (dark ? BAND_STYLE_DARK : BAND_STYLE).unassessed;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: size === 'sm' ? '3px 10px' : '5px 13px',
        borderRadius: 999,
        fontSize: size === 'sm' ? 11 : 13,
        fontWeight: 600,
        fontFamily: SANS,
        background: style.bg,
        border: `1.5px solid ${style.border}`,
        color: style.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

export default BandChip;
