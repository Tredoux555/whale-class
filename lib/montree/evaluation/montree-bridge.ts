/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Montree Milestones — the seam between this module and the rest of the Montree repo.
 *
 * ════════════════════════════════════════════════════════════════════════════════════
 *  MERGE STEP — do this once, when you drop these files into the repo.
 *
 *  Delete the three `notWired()` bodies below and wire the real helpers instead:
 *
 *      import { getSupabase } from '@/lib/supabase-client';
 *      import { verifySchoolRequest } from '@/lib/montree/verify-request';
 *      import { isEnabled } from '@/lib/montree/features';        // server-side flag read
 *
 *  Exact paths and return shapes vary slightly by repo revision — grep for
 *  `verifySchoolRequest(` in `app/api/montree/work-rhythm/route.ts` and copy whatever
 *  that route does. Adapt the result into `SchoolAuth` below; nothing else in this
 *  module reaches outside itself.
 * ════════════════════════════════════════════════════════════════════════════════════
 *
 * Why a seam at all: this module was authored outside the repo and must typecheck and be
 * reviewable standalone. Everything the module needs from Montree passes through here, so
 * the integration surface is four functions, not forty import lines.
 */

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

export class EvaluationNotWiredError extends Error {
  constructor(what: string) {
    super(
      `[montree-milestones] ${what} is not wired. Open lib/montree/evaluation/montree-bridge.ts ` +
      'and complete the MERGE STEP at the top of the file.',
    );
    this.name = 'EvaluationNotWiredError';
  }
}

const notWired = (what: string): never => { throw new EvaluationNotWiredError(what); };

/* ─────────────────────────────────────────────────────── replace these three */

/** MERGE STEP: `return getSupabase();` */
export function getSupabaseClient(): SupabaseLike {
  return notWired('getSupabaseClient');
}

/** MERGE STEP: call the repo helper and map its result onto `SchoolAuth`. Return null when unauthenticated. */
export async function verifySchoolRequest(_request: Request): Promise<SchoolAuth | null> {
  return notWired('verifySchoolRequest');
}

/** MERGE STEP: `return isEnabled(schoolId, featureKey);` — must fail CLOSED on error. */
export async function isFeatureEnabled(_schoolId: string, _featureKey: string): Promise<boolean> {
  return notWired('isFeatureEnabled');
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
