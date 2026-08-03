'use client';

/**
 * One picture from the item bank.
 *
 * The bank stores each stimulus as an inline SVG body (`render.svg`) plus a viewBox — no
 * external files, so a check-in renders identically offline, on a USB-stick copy, and in
 * the printed paper pack.
 *
 * On `dangerouslySetInnerHTML`: this markup is authored content from our own item bank,
 * served by our own gated endpoint, and it is SVG geometry — there is no user-supplied
 * string anywhere in this path. It is validated at bank-build time
 * (scripts/evaluation/merge-item-bank.mjs) rather than sanitised per render.
 *
 * `altText` is a real description, not the answer: a child using a screen reader must be
 * able to hear what is on the card without being told which card is the one to touch.
 */
import type { ProjectedStimulus } from '@/lib/montree/evaluation/bank-projection';

export function StimulusSvg({
  stimulus,
  maxHeight = 230,
  label,
}: {
  stimulus: ProjectedStimulus | null | undefined;
  maxHeight?: number;
  label?: string;
}) {
  if (!stimulus) {
    // A missing stimulus is a bank defect, not a runtime error — draw the empty card so
    // the sitting continues, and let the teacher move on.
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" style={{ maxHeight }}>
        <rect x="8" y="8" width="84" height="84" rx="8" fill="#FFFDF8" stroke="#D9C7A5" strokeWidth="3" />
      </svg>
    );
  }
  const alt = label ?? stimulus.altText?.en ?? stimulus.label?.en ?? '';
  return (
    <svg
      viewBox={stimulus.render.viewBox}
      width="100%"
      height="100%"
      role="img"
      aria-label={alt}
      style={{ maxHeight, pointerEvents: 'none' }}
      dangerouslySetInnerHTML={{ __html: stimulus.render.svg }}
    />
  );
}

export default StimulusSvg;
