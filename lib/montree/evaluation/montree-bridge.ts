/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Montree Milestones — the seam between this module and the rest of the Montree repo.
 *
 * ════════════════════════════════════════════════════════════════════════════════════
 *  MERGE STEP — DONE (Phase 5). The three `notWired()` stubs are wired to the real
 *  repo helpers below. Two adaptations were required and are load-bearing:
 *
 *   1. `isFeatureEnabled` in `lib/montree/features/server.ts` takes THREE arguments
 *      (`supabase, schoolId, featureKey`). Every call site in this module uses the
 *      two-argument form, so the bridge keeps its 2-arg signature and supplies the
 *      service-role client itself. Do not "simplify" this back to a pass-through.
 *   2. `verifySchoolRequest` in `lib/montree/verify-request.ts` is typed for a
 *      `NextRequest` and returns `VerifiedRequest | NextResponse` (the 401 body).
 *      The evaluation routes are App Router route handlers, so the object they
 *      receive IS a NextRequest at runtime even though it is declared as `Request`.
 *      See the cast note on `verifySchoolRequest()` below.
 * ════════════════════════════════════════════════════════════════════════════════════
 *
 * Why a seam at all: this module was authored outside the repo and must typecheck and be
 * reviewable standalone. Everything the module needs from Montree passes through here, so
 * the integration surface is four functions, not forty import lines.
 */
import type { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest as realVerifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled as realIsFeatureEnabled } from '@/lib/montree/features/server';
import type { FeatureKey } from '@/lib/montree/features/types';

/** Minimal structural view of the Supabase service-role client this module uses. */
export interface SupabaseLike {
  from: (table: string) => any;
  rpc?: (fn: string, params?: Record<string, unknown>) => any;
}

/** What `verifySchoolRequest()` gives a route: identity plus tenancy. */
export interface SchoolAuth {
  userId: string;
  schoolId: string;
  classroomId: string | null;
  role: 'teacher' | 'principal' | 'super_admin' | 'homeschool_parent' | string;
}

/**
 * Kept exported: callers (and older tests) still catch it, and it remains the right error
 * for any future seam function that is added but not yet wired.
 */
export class EvaluationNotWiredError extends Error {
  constructor(what: string) {
    super(
      `[montree-milestones] ${what} is not wired. Open lib/montree/evaluation/montree-bridge.ts ` +
      'and complete the MERGE STEP at the top of the file.',
    );
    this.name = 'EvaluationNotWiredError';
  }
}

/* ──────────────────────────────────────────────────────────── wired helpers */

/** The repo's server-side service-role singleton. */
export function getSupabaseClient(): SupabaseLike {
  return getSupabase() as unknown as SupabaseLike;
}

/**
 * Identity + tenancy for one request.
 *
 * The real helper reads the httpOnly `montree-auth` cookie first and falls back to
 * `Authorization: Bearer`, returning a 401 `NextResponse` when neither works. We
 * translate that response into `null` — `openRoute()` owns the 401 body for this module
 * so every evaluation route answers in the same shape.
 *
 * The cast: App Router hands route handlers a `NextRequest`, but the evaluation routes
 * declare the parameter as `Request` (they were authored outside the repo). `NextRequest
 * extends Request`, so the value is always the richer type at runtime. The guard below
 * makes that assumption explicit rather than silent: a bare `Request` (i.e. this was
 * called from somewhere that is not the Next.js router) is refused, never treated as
 * anonymous-but-fine and never crashed on `.cookies` being undefined.
 */
export async function verifySchoolRequest(request: Request): Promise<SchoolAuth | null> {
  if (!('cookies' in (request as object))) {
    throw new Error(
      '[montree-milestones] verifySchoolRequest was handed a bare Request. Evaluation routes ' +
      'must be invoked as Next.js App Router route handlers (NextRequest).',
    );
  }
  const result = await realVerifySchoolRequest(request as NextRequest);
  // NextResponse extends Response — a Response here means 401/403 (bad token, locked school).
  if (result instanceof Response) return null;
  return {
    userId: result.userId,
    schoolId: result.schoolId,
    classroomId: result.classroomId ?? null,
    role: result.role,
  };
}

/**
 * Flag read. The repo helper is 3-arg (`supabase, schoolId, featureKey`); this module
 * calls it 2-arg everywhere, so the client is supplied here. Fails CLOSED: the real
 * implementation returns `false` on any error and does not cache the failure.
 */
export async function isFeatureEnabled(schoolId: string, featureKey: string): Promise<boolean> {
  if (!schoolId || !featureKey) return false;
  return realIsFeatureEnabled(getSupabase(), schoolId, featureKey as FeatureKey);
}

/* ───────────────────────────────────────── implemented here, no repo dependency */

/**
 * The cross-tenant guard. CLAUDE.md states it as a hard rule with no exceptions:
 * every route accepting a child_id verifies the child belongs to the authenticated
 * school, in application code, because RLS in this codebase is `USING (true)` and will
 * not stop a cross-tenant read on its own.
 *
 * If the repo already exports `verifyChildBelongsToSchool()`, delete this and re-export
 * that one — the query below is deliberately identical in effect.
 */
export async function verifyChildBelongsToSchool(
  supabase: SupabaseLike,
  childId: string,
  schoolId: string,
): Promise<{ ok: true; classroomId: string | null; name: string | null; birthDate: string | null } | { ok: false; reason: string }> {
  if (!childId || !schoolId) return { ok: false, reason: 'missing child or school id' };

  const { data, error } = await supabase
    .from('montree_children')
    .select('id, name, classroom_id, school_id, date_of_birth')
    .eq('id', childId)
    .maybeSingle();

  if (error) return { ok: false, reason: `child lookup failed: ${error.message ?? 'unknown error'}` };
  if (!data) return { ok: false, reason: 'child not found' };

  if (data.school_id && data.school_id === schoolId) {
    return { ok: true, classroomId: data.classroom_id ?? null, name: data.name ?? null, birthDate: data.date_of_birth ?? null };
  }

  // Older rows may not carry school_id directly — fall back to the classroom chain.
  if (data.classroom_id) {
    const { data: classroom, error: cErr } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', data.classroom_id)
      .maybeSingle();
    if (cErr) return { ok: false, reason: `classroom lookup failed: ${cErr.message ?? 'unknown error'}` };
    if (classroom?.school_id === schoolId) {
      return { ok: true, classroomId: data.classroom_id, name: data.name ?? null, birthDate: data.date_of_birth ?? null };
    }
  }

  return { ok: false, reason: 'child does not belong to this school' };
}

/** Same guard for a classroom id supplied in a query string. */
export async function verifyClassroomBelongsToSchool(
  supabase: SupabaseLike,
  classroomId: string,
  schoolId: string,
): Promise<boolean> {
  if (!classroomId || !schoolId) return false;
  const { data, error } = await supabase
    .from('montree_classrooms')
    .select('id, school_id')
    .eq('id', classroomId)
    .maybeSingle();
  if (error || !data) return false;
  return data.school_id === schoolId;
}
