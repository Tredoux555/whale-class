/**
 * Montree Milestones — shared constants.
 *
 * Public name: "Montree Milestones". Internal feature key: `child_evaluation`.
 * Child-facing name for a sitting: "Discovery Time". Never "test", never "assessment"
 * on a surface a teacher, parent or child can read (see forbidden-terms.ts).
 */
import type { AgeBand, DeliveryMode, ModuleId, WindowCode } from './types';

export const FEATURE_KEY = 'child_evaluation';
export const PUBLIC_NAME = 'Montree Milestones';
export const CHILD_FACING_NAME = 'Discovery Time';

/**
 * Montree Canopy — the Grade 1 (G1) tier of the same check-in, gated by its OWN flag.
 *
 * A school with `child_evaluation` on but `child_evaluation_g1` off runs kindergarten
 * only: every G1 request is refused with the ordinary `featureOff()` 503, and the G1
 * chip never appears in the runner. Canopy is never implied by the Milestones flag.
 */
export const FEATURE_KEY_G1 = 'child_evaluation_g1';
export const CANOPY_PUBLIC_NAME = 'Montree Canopy';
export const CANOPY_BAND: AgeBand = 'G1';

/** Every band the instrument knows, in order. The DB CHECK constraints mirror this list. */
export const AGE_BANDS: readonly AgeBand[] = ['A3', 'A4', 'A5', 'G1'];

export function isAgeBand(v: unknown): v is AgeBand {
  return typeof v === 'string' && (AGE_BANDS as readonly string[]).includes(v);
}

export const WINDOW_CODES: readonly WindowCode[] = ['autumn', 'winter', 'spring'];
export const DELIVERY_MODES: readonly DeliveryMode[] = ['tablet', 'paper', 'observation_only'];
export const CORE_MODULE_IDS: readonly ModuleId[] = ['M-LIT', 'M-MATH', 'M-EFL'];
export const ALL_MODULE_IDS: readonly ModuleId[] = ['M-LIT', 'M-MATH', 'M-EFL', 'M-FOCUS', 'M-OBS'];

/** DB CHECK constraint mirrors — validate here so a bad body is a 400, not a 500. */
export const AGE_MONTHS_MIN = 24;
export const AGE_MONTHS_MAX = 84;

/** A cohort figure is not published below this many children — small cells identify people. */
export const COHORT_MIN_CHILDREN = 12;

export const SESSION_SOURCES = ['montree_ui', 'tablet_import', 'paper_entry'] as const;
export type SessionSource = (typeof SESSION_SOURCES)[number];

/** `2026-2027`. Derived from a date when the caller does not supply one. */
export function schoolYearFor(date: Date = new Date(), yearStartMonth = 8): string {
  const y = date.getFullYear();
  const start = date.getMonth() >= yearStartMonth ? y : y - 1;
  return `${start}-${start + 1}`;
}

export function isWindowCode(v: unknown): v is WindowCode {
  return typeof v === 'string' && (WINDOW_CODES as readonly string[]).includes(v);
}

export function isDeliveryMode(v: unknown): v is DeliveryMode {
  return typeof v === 'string' && (DELIVERY_MODES as readonly string[]).includes(v);
}
