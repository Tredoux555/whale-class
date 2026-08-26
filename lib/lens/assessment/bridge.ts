// lib/lens/assessment/bridge.ts
// The seam between the milestone instrument and Montree Lens.
//
// This is the Lens twin of lib/montree/evaluation/montree-bridge.ts, and it is
// the reason that file is not imported anywhere under a /lens path. The Montree
// bridge wires the instrument to `verifySchoolRequest` (the montree-auth cookie),
// `isFeatureEnabled` (per-school flags) and `verifyChildBelongsToSchool` (the
// montree_children roster). Lens has none of those three:
//
//   • Auth is the `lens_observer` cookie, verified by requireObserver().
//   • There is NO feature flag. Lens is one product for one observer and every
//     screen in it is hers; gating a Lens surface behind a Montree school flag
//     would gate it behind a school she does not belong to.
//   • There is NO child roster. A check-in is filed against the free-text
//     `child_alias` she types, so the cross-tenant child guard has nothing to
//     check and is replaced by the ownership rule below.
//
// 🚨 THE OWNERSHIP RULE (lib/lens/db.ts states it once for the whole product):
// existence is never ownership. Every read and every write in this feature is
// filtered by observer_id, and a session that is not hers reads exactly like a
// session that does not exist — 404, never 403, so the API never confirms that
// somebody else's session id is real.
//
// 🚨 MIDDLEWARE PROTECTS NOTHING HERE. `/api/lens/*` sits outside the middleware
// matcher, so every handler calls openAssessmentRoute() itself. There is no
// ambient auth to fall back on.

import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase, type UntypedClient } from '@/lib/supabase-client';
import { lensDb } from '@/lib/lens/db';
import { lensError, requireObserver } from '@/lib/lens/route-helpers';
import type { LensAssessmentSessionRow } from './types';

export type LensDbClient = UntypedClient;

export interface LensAssessmentContext {
  observerId: string;
  supabase: LensDbClient;
}

/** The service-role client, through the Lens accessor so there is one door. */
export function assessmentDb(): LensDbClient {
  return lensDb();
}

/**
 * Steps every route starts with: verify the observer, hand back the client.
 *
 * Used as:  const opened = await openAssessmentRoute(request);
 *           if ('response' in opened) return opened.response;
 * which is the same shape openRoute() uses in the Montree copy, so the two
 * feature bodies stay comparable line for line.
 */
export async function openAssessmentRoute(
  request: NextRequest,
): Promise<{ ctx: LensAssessmentContext } | { response: NextResponse }> {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return { response: session };
  return { ctx: { observerId: session.observerId, supabase: assessmentDb() } };
}

/* ─────────────────────────────────────────────────────────── schema probes */

/**
 * Postgres / PostgREST codes that mean "migration 340 hasn't been run".
 *
 * Wider than lib/lens/db.ts's isSetupPending on purpose: PostgREST answers a
 * missing table from its own schema cache with a PGRST code rather than the
 * Postgres one, and a check-in must degrade to a clean "not set up yet" in both
 * cases rather than a 500 with a stack trace in it.
 */
const SETUP_CODES = new Set(['42703', '42P01', 'PGRST202', 'PGRST204', 'PGRST205']);

export function isAssessmentSetupPending(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  if (e.code && SETUP_CODES.has(e.code)) return true;
  const msg = (e.message ?? '').toLowerCase();
  return (
    msg.includes('does not exist') &&
    (msg.includes('relation') || msg.includes('column') || msg.includes('schema cache'))
  );
}

export const ASSESSMENT_MIGRATION_FILE = 'migrations/340_lens_assessment.sql';

export function setupPending(detail?: string): NextResponse {
  return NextResponse.json(
    {
      error: 'setup_pending',
      migration: ASSESSMENT_MIGRATION_FILE,
      detail: detail ?? null,
    },
    { status: 503 },
  );
}

/**
 * Prove the columns this feature writes exist BEFORE anything is written.
 *
 * Cheap — one zero-row select per table — and it is the mechanical form of the
 * migration-311 lesson that both copies of this instrument carry: verify the
 * target schema before the commit path runs, not after data is gone.
 */
export async function assertAssessmentSchemaReady(
  supabase: LensDbClient,
): Promise<NextResponse | null> {
  const probes: Array<[string, string]> = [
    ['lens_assessment_sessions', 'id, observer_id, school_id, classroom_id, child_alias, summary_json, map_suppressed'],
    ['lens_assessment_item_responses', 'id, session_id, observer_id, item_id, client_points_awarded'],
    ['lens_assessment_milestone_results', 'id, session_id, observer_id, milestone_id, band_final, school_year, window_code'],
  ];
  for (const [table, columns] of probes) {
    const { error } = await supabase.from(table).select(columns).limit(0);
    if (error) {
      if (isAssessmentSetupPending(error)) return setupPending(`${table}: ${(error as { message?: string }).message ?? ''}`);
      return lensError(`assessment:schema:${table}`, error);
    }
  }
  return null;
}

/* ───────────────────────────────────────────────────────── ownership loads */

export const SESSION_COLUMNS = '*';

/**
 * A session, IF it belongs to this observer. The observer_id filter is in the
 * query rather than in a check afterwards, so there is no version of this
 * function that fetches somebody else's row and then decides what to do with it.
 */
export async function loadOwnedSession(
  supabase: LensDbClient,
  observerId: string,
  sessionId: string,
): Promise<LensAssessmentSessionRow | null> {
  const { data, error } = await supabase
    .from('lens_assessment_sessions')
    .select(SESSION_COLUMNS)
    .eq('id', sessionId)
    .eq('observer_id', observerId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as LensAssessmentSessionRow) ?? null;
}

/** Kept for symmetry with lib/lens/db.ts, which owns the same accessor. */
export function rawSupabase(): LensDbClient {
  return getSupabase();
}
