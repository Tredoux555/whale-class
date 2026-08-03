/**
 * Montree Milestones — reflection-report design tokens.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │ 🚫 NEVER-PARENT. Nothing in components/montree/evaluation-reports/** may be      │
 * │ imported from app/montree/parent/** or components/parent/**. These surfaces are  │
 * │ leadership reflection views (principal + organisational tier). Parents get the   │
 * │ Growth Story about their own child, never a school-wide or cross-school figure.  │
 * │ `app/montree/parent/milestones/` is a DEPRECATED, unrelated legacy route with a  │
 * │ colliding name — do not wire anything here into it.                             │
 * └─────────────────────────────────────────────────────────────────────────────────┘
 *
 * ── Colour, validated not eyeballed ────────────────────────────────────────────────
 * Surface is Montree's dark-forest page plane, `#0a1a0f`. Every ramp below was run
 * through the data-viz validator against that exact surface:
 *
 *   node scripts/validate_palette.js "#6ee7b7,#34d399,#0f9d76" --mode dark \
 *        --surface "#0a1a0f" --ordinal                      → ALL CHECKS PASS
 *   node scripts/validate_palette.js "#f2a883,#d95926,#8f3a15" --mode dark \
 *        --surface "#0a1a0f" --ordinal                      → ALL CHECKS PASS
 *   node scripts/validate_palette.js "#3987e5,#d95926" --mode dark \
 *        --surface "#0a1a0f" --pairs all                    → ALL CHECKS PASS
 *
 * Why these jobs get these ramps:
 *   • Bands (emerging → developing → secure) are an ORDINAL set, so they get one hue,
 *     light→dark — Montree emerald, so the school's own colour carries its own meaning.
 *     They are never a red/amber/green traffic light: a band is a description of where
 *     a child is, not a verdict, and a status palette would import exactly the
 *     pass/fail register this product refuses.
 *   • `unassessed` is deliberately OUTSIDE the ramp — a neutral, always accompanied by
 *     its own legend entry and its own number. It is absence of evidence, not a low band.
 *   • Growth (moved up / steady / watching) is a second ordinal set and takes a
 *     different hue family so it can never be misread as a band.
 *   • A single-series magnitude bar (MAP% by classroom, by school) is one colour for
 *     every bar — colouring bars darker-where-bigger would double-encode the length.
 */

/** Montree's dark-forest chrome. The chart surface every ramp was validated against. */
export const SURFACE = '#0a1a0f';

export const T = {
  bg: SURFACE,
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.28), transparent 60%)',
  card: 'rgba(255,255,255,0.035)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  /** Hairline grid and axis. Solid, one shade off the surface — never dashed. */
  grid: 'rgba(255,255,255,0.08)',
  axis: 'rgba(255,255,255,0.16)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
} as const;

export type BandKey = 'emerging' | 'developing' | 'secure' | 'unassessed';

/** Ordinal ramp, one hue, light→dark. Brightest = furthest along. */
export const BAND_COLOR: Record<BandKey, string> = {
  secure: '#6ee7b7',
  developing: '#34d399',
  emerging: '#0f9d76',
  unassessed: '#7d8f85',
};

export const BAND_LABEL: Record<BandKey, string> = {
  secure: 'Secure',
  developing: 'Developing',
  emerging: 'Emerging',
  unassessed: 'Not checked yet',
};

/** Legend / stack order: strongest first, absence of evidence always last. */
export const BAND_ORDER: BandKey[] = ['secure', 'developing', 'emerging', 'unassessed'];

export type GrowthKey = 'movedUp' | 'steady' | 'watching';

/** Second ordinal ramp, different hue family so growth never reads as a band. */
export const GROWTH_COLOR: Record<GrowthKey, string> = {
  movedUp: '#f2a883',
  steady: '#d95926',
  watching: '#8f3a15',
};

export const GROWTH_LABEL: Record<GrowthKey, string> = {
  movedUp: 'Moved up a band',
  steady: 'Holding steady',
  watching: 'We are watching',
};

export const GROWTH_ORDER: GrowthKey[] = ['movedUp', 'steady', 'watching'];

/** Single-series magnitude colour. Every bar in a one-series chart wears this. */
export const SERIES_1 = '#3987e5';

export const WINDOW_LABEL: Record<string, string> = {
  autumn: 'Autumn',
  winter: 'Winter',
  spring: 'Spring',
};

export function windowLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return WINDOW_LABEL[code] ?? code;
}

/** `48.3%` / `—`. Percentages are always rendered beside their n, never alone. */
export function pct(value: number | null | undefined, digits = 0): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function num(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return String(value);
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}
