// lib/montree/photo-identification/flag.ts
//
// 🚨 PHOTO RECOGNITION IS RETIRED (2026-09-17).
//
// The two-pass Haiku→Sonnet work-identification pipeline is switched OFF at
// every entry point. The code is deliberately KEPT — nothing is deleted — so
// the decision is reversible with one environment variable and a redeploy.
//
// Teacher tagging at capture time is the primary path now: the capture screen
// asks "what work is this?" before the upload leaves the phone, the upload
// route stamps work_id + teacher_confirmed = true + identification_status =
// 'confirmed', and the tracker/weekly/monthly/montage/report surfaces read
// exactly what they always read. Nothing downstream changed shape.
//
// Default is OFF. The flag must be the literal string 'true' to re-enable —
// an unset, empty or misspelt value never turns the spend back on.
//
// See docs/handoffs/PHOTO_RECOGNITION_RETIRED_2026-09-17.md.

/** Server-side switch. OFF unless PHOTO_RECOGNITION_ENABLED === 'true'. */
export function isPhotoRecognitionEnabled(): boolean {
  return process.env.PHOTO_RECOGNITION_ENABLED === 'true';
}

/**
 * Client-side mirror. Next.js inlines NEXT_PUBLIC_* at build time, so this
 * must read the full identifier literally (no computed property access).
 */
export function isPhotoRecognitionEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_PHOTO_RECOGNITION_ENABLED === 'true';
}

/** The one sentence every retired entry point answers with. */
export const PHOTO_RECOGNITION_RETIRED_NOTE =
  'Photo recognition was retired on 2026-09-17. Teachers tag the work at capture time; ' +
  'set PHOTO_RECOGNITION_ENABLED=true to bring the pipeline back.';

/** Machine-readable marker every retired response carries. */
export const PHOTO_RECOGNITION_RETIRED_CODE = 'photo_recognition_retired' as const;
