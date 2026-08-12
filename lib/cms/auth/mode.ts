// lib/cms/auth/mode.ts
// ============================================================================
// DEMO MODE vs LIVE MODE — the one switch the whole CMS surface reads.
// ============================================================================
// Phase 1 shipped a surface that runs entirely on lib/cms/demo/seed.ts. Phase 2
// gives it a database, and that database must not become a prerequisite for
// looking at the product: the founder shows CMS on a laptop with no Supabase
// env at all, and it has to render six children and a full roster anyway.
//
// So every data path in CMS asks this module first:
//
//   DEMO MODE  — no database. Pages render lib/cms/demo/seed.ts, /cms/login says
//                so plainly, and the route gate is OFF (every layer is walkable).
//   LIVE MODE  — a real Supabase project. Pages read cms_* tables, /cms/login
//                authenticates, and /cms/parent|teacher|org require the matching
//                role.
//
// THE DEFAULT IS THE IMPORTANT PART: live when Supabase is configured, demo
// when it is not. A deployment that has a database is enforced by default —
// you must go out of your way to turn the gate OFF, never to turn it on. That
// is the safe direction for the failure to point.
//
// CMS_AUTH_ENFORCED overrides the default in either direction:
//   CMS_AUTH_ENFORCED=1|true|on    → live, even without Supabase env (test only —
//                                    every query will fail; useful for proving
//                                    the gate redirects)
//   CMS_AUTH_ENFORCED=0|false|off  → demo, even WITH Supabase configured (the
//                                    founder's demo laptop pointed at prod)
//
// Edge-safe: no imports, no next/headers, no supabase-js. middleware.ts calls
// this on every /cms request.
// ============================================================================

const TRUE_VALUES = new Set(['1', 'true', 'on', 'yes']);
const FALSE_VALUES = new Set(['0', 'false', 'off', 'no']);

/** Is a Supabase project configured for server-side (service-role) access? */
export function hasSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * True when CMS should read the database and enforce the role gate.
 * False when CMS should render seed data and let every layer be walked.
 */
export function isCmsLive(): boolean {
  const flag = (process.env.CMS_AUTH_ENFORCED ?? '').trim().toLowerCase();
  if (TRUE_VALUES.has(flag)) return true;
  if (FALSE_VALUES.has(flag)) return false;
  return hasSupabaseConfigured();
}

/** The inverse, spelled out — reads better at call sites that seed data. */
export function isCmsDemo(): boolean {
  return !isCmsLive();
}
