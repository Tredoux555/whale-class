// components/lens/assessment/LensBandChip.tsx
//
// The band chip, in Lens's dark forest palette.
//
// Why not components/montree/evaluation/BandChip directly: that component paints
// from BAND_STYLE / BAND_STYLE_DARK, which are the Montree dashboard's tokens.
// They read correctly on Montree's chrome and slightly wrong on Lens's — a
// different green, a different border weight. The SEMANTICS are copied exactly,
// including the fourth chip, and that is the part that matters:
//
// 🚨 "Not looked at" IS A FIRST-CLASS STATE, not an absence. A milestone without
// enough evidence is reported as unassessed — never silently dropped from the
// list, and never guessed down to Emerging. If this chip ever stops appearing,
// something upstream has started inventing bands.

import type { BandOrUnassessed } from '@/lib/montree/evaluation/types';

const STYLE: Record<string, string> = {
  secure:
    'border-[rgba(52,211,153,0.45)] bg-[rgba(52,211,153,0.14)] text-emerald-300',
  developing:
    'border-[rgba(232,201,106,0.40)] bg-[rgba(232,201,106,0.12)] text-forest-gold',
  emerging:
    'border-[rgba(224,138,95,0.40)] bg-[rgba(224,138,95,0.12)] text-[#f2b48c]',
  unassessed:
    'border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] text-forest-muted',
};

export const BAND_LABEL: Record<string, string> = {
  secure: 'Secure',
  developing: 'Developing',
  emerging: 'Emerging',
  unassessed: 'Not looked at',
};

export function LensBandChip({
  band,
  label,
  size = 'md',
}: {
  band: BandOrUnassessed | string;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const tone = STYLE[band] ?? STYLE.unassessed;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold ${tone} ${
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-[12.5px]'
      }`}
    >
      {label ?? BAND_LABEL[band] ?? band}
    </span>
  );
}

export default LensBandChip;
