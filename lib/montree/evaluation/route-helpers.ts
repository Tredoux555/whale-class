/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Montree Milestones — shared route plumbing.
 *
 * Every evaluation route does the same five things before it touches data:
 *   1. verifySchoolRequest()            → 401 if there is no verified school session
 *   2. role ∈ { teacher, principal }    → 403; Montree Milestones is a teacher reflection
 *                                         tool. A parent session (homeschool_parent) and an
 *                                         agent session must never read a child's bands.
 *   3. isFeatureEnabled(…, 'child_evaluation') → friendly 503 { available:false } when off
 *   4. verifyChildBelongsToSchool()     → 403 on any child id that isn't this school's
 *   5. treat 42703 / 42P01 as "migration not run" → 503 { migration_pending:true }, never a 500
 *
 * Rule 4 exists because of the migration-311 postmortem: a write path that assumed its
 * columns existed failed silently while the parent record was already marked committed.
 * Here, a missing column can only ever produce a loud, diagnosable 503.
 */
import { CANOPY_BAND, CANOPY_PUBLIC_NAME, FEATURE_KEY, FEATURE_KEY_G1 } from './constants';
import {
  getSupabaseClient, isFeatureEnabled, verifySchoolRequest,
  verifyChildBelongsToSchool, type SchoolAuth, type SupabaseLike,
} from './montree-bridge';

export const MIGRATION_FILE = 'migrations/314_montree_evaluation_system.sql';

/** Postgres / PostgREST codes that mean "the schema isn't there yet". */
const MIGRATION_CODES = new Set(['42703', '42P01', 'PGRST205', 'PGRST204', 'PGRST202']);

export function isMigrationPendingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  if (e.code && MIGRATION_CODES.has(e.code)) return true;
  const msg = (e.message ?? '').toLowerCase();
  return (
    msg.includes('does not exist') &&
    (msg.includes('relation') || msg.includes('column') || msg.includes('schema cache'))
  );
}

/**
 * Postgres CHECK-constraint violation. This is the Montree Canopy pre-migration guard.
 *
 * Repo law: code deploys BEFORE the SQL is run. Between the deploy and Tredoux running
 * migration 322, `age_band` still reads `CHECK (age_band IN ('A3','A4','A5'))`, so a G1
 * insert comes back 23514. Left alone that is an opaque 500 on a brand-new feature; caught
 * here it is the same friendly, diagnosable "migration pending" 503 every other missing
 * piece of schema produces. A3/A4/A5 can never reach this path — they satisfy the old
 * constraint and the new one identically.
 */
const CHECK_VIOLATION_CODE = '23514';

export function isCheckConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  if (e.code === CHECK_VIOLATION_CODE) return true;
  const msg = (e.message ?? '').toLowerCase();
  return msg.includes('violates check constraint');
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export const unauthorized = () => json({ error: 'unauthorized' }, 401);
export const forbidden = (reason: string) => json({ error: 'forbidden', reason }, 403);

/**
 * Who may administer or read a check-in.
 *
 * `MontreeTokenPayload.role` is one of teacher | principal | homeschool_parent | agent.
 * Migration 314 stores `administered_by_role IN ('teacher','principal','system')`, and
 * ARCHITECTURE.md §3 makes this a teacher reflection tool — so the two role vocabularies
 * agree, and the two roles NOT on this list are excluded deliberately:
 *   • homeschool_parent — the parent-facing surfaces must never see evaluation data.
 *   • agent            — an agent session's schoolId is INERT (see verify-request.ts),
 *                        so tenancy cannot be enforced for it here at all.
 */
export const EVALUATION_ROLES: readonly string[] = ['teacher', 'principal'];

export const forbiddenRole = (role: string) =>
  json({
    error: 'forbidden',
    reason: 'role_not_permitted',
    role,
    message: 'Montree Milestones is available to teachers and principals.',
  }, 403);
export const badRequest = (error: string, detail?: unknown) => json({ error, detail: detail ?? null }, 400);

export const featureOff = () =>
  json({
    available: false,
    reason: 'feature_off',
    message: 'Montree Milestones is not switched on for this school.',
  }, 503);

export const canopyOff = () =>
  json({
    available: false,
    reason: 'feature_off',
    feature: FEATURE_KEY_G1,
    message: `${CANOPY_PUBLIC_NAME} (Grade 1) is not switched on for this school.`,
  }, 503);

export const migrationPending = (detail?: string) =>
  json({
    available: false,
    reason: 'migration_pending',
    migration_pending: true,
    message: `Montree Milestones is installed but ${MIGRATION_FILE} has not been run yet.`,
    detail: detail ?? null,
  }, 503);

export const CANOPY_MIGRATION_FILE = 'migrations/322_montree_canopy_g1.sql';

/** The G1-specific twin of `migrationPending`, for a CHECK constraint not yet widened. */
export const canopyMigrationPending = (detail?: string) =>
  json({
    available: false,
    reason: 'migration_pending',
    migration_pending: true,
    feature: FEATURE_KEY_G1,
    message:
      `${CANOPY_PUBLIC_NAME} is installed but ${CANOPY_MIGRATION_FILE} has not been run yet, ` +
      'so this database still only accepts the kindergarten bands. Kindergarten check-ins are unaffected.',
    detail: detail ?? null,
  }, 503);

/** Surface the real error. A generic "something went wrong" is a build defect here. */
export const serverError = (where: string, error: unknown) => {
  const e = error as { message?: string; code?: string; details?: string } | null;
  console.error(`[montree-milestones] ${where}:`, error);
  return json({
    error: 'evaluation_failed',
    where,
    detail: e?.message ?? String(error),
    code: e?.code ?? null,
  }, 500);
};

export interface RouteContext {
  auth: SchoolAuth;
  supabase: SupabaseLike;
}

/** Steps 1–3. Returns a Response to send straight back, or the context to carry on with. */
export async function openRoute(request: Request): Promise<{ ctx: RouteContext } | { response: Response }> {
  let auth: SchoolAuth | null = null;
  try {
    auth = await verifySchoolRequest(request);
  } catch (error) {
    return { response: serverError('auth', error) };
  }
  if (!auth?.schoolId) return { response: unauthorized() };

  if (!EVALUATION_ROLES.includes(auth.role)) {
    console.warn(`[montree-milestones][SECURITY] role ${auth.role} rejected for school ${auth.schoolId}`);
    return { response: forbiddenRole(auth.role) };
  }

  let enabled = false;
  try {
    enabled = await isFeatureEnabled(auth.schoolId, FEATURE_KEY);
  } catch (error) {
    // Fail closed — a flag lookup that blew up must not open a gated feature.
    return { response: serverError('feature_flag', error) };
  }
  if (!enabled) return { response: featureOff() };

  return { ctx: { auth, supabase: getSupabaseClient() } };
}

/**
 * The Montree Canopy gate. `child_evaluation` opens the instrument; `child_evaluation_g1`
 * opens the Grade 1 TIER of it. A school running kindergarten only never gets a G1 sitting,
 * a G1 bank slice or a G1 import, and finds out through the same friendly 503 shape as any
 * other switched-off feature rather than a 400 it cannot interpret.
 *
 * Fails CLOSED: a flag lookup that blows up is a server error, never an open door.
 * Bands other than G1 are waved through untouched — this can only ever ADD a refusal.
 */
export async function requireCanopyForBand(
  ctx: RouteContext,
  ageBand: string | null | undefined,
): Promise<Response | null> {
  if (ageBand !== CANOPY_BAND) return null;
  try {
    const enabled = await isFeatureEnabled(ctx.auth.schoolId, FEATURE_KEY_G1);
    return enabled ? null : canopyOff();
  } catch (error) {
    return serverError('canopy_feature_flag', error);
  }
}

export interface VerifiedChild { classroomId: string | null; name: string | null; birthDate: string | null }

/** Step 3. */
export async function requireChild(
  ctx: RouteContext,
  childId: string,
): Promise<{ response: Response } | { child: VerifiedChild }> {
  const check = await verifyChildBelongsToSchool(ctx.supabase, childId, ctx.auth.schoolId);
  if (!check.ok) {
    console.warn(`[montree-milestones][SECURITY] child ${childId} rejected for school ${ctx.auth.schoolId}: ${check.reason}`);
    return { response: forbidden(check.reason) };
  }
  return { child: { classroomId: check.classroomId, name: check.name, birthDate: check.birthDate } };
}

/**
 * Probe that the columns this module writes actually exist before anything is written.
 * Cheap (one zero-row select per table) and it is the mechanical form of the 311 lesson:
 * verify the target schema BEFORE the commit path runs, not after data is gone.
 */
export async function assertSchemaReady(supabase: SupabaseLike): Promise<Response | null> {
  const probes: Array<[string, string]> = [
    ['montree_evaluation_sessions', 'id, school_id, classroom_id, child_id, bank_checksum, summary_json, map_suppressed'],
    ['montree_evaluation_item_responses', 'id, session_id, school_id, classroom_id, item_id, client_points_awarded'],
    ['montree_evaluation_milestone_results', 'id, session_id, school_id, classroom_id, milestone_id, band_final, school_year, window_code'],
  ];
  for (const [table, columns] of probes) {
    const { error } = await supabase.from(table).select(columns).limit(0);
    if (error) {
      if (isMigrationPendingError(error)) return migrationPending(`${table}: ${error.message}`);
      return serverError(`schema probe on ${table}`, error);
    }
  }
  return null;
}

/** Body parsing that can never throw an opaque 500. */
export async function readJson<T>(request: Request): Promise<{ body: T } | { response: Response }> {
  try {
    const body = (await request.json()) as T;
    if (!body || typeof body !== 'object') return { response: badRequest('invalid_json', 'expected a JSON object body') };
    return { body };
  } catch (error) {
    return { response: badRequest('invalid_json', (error as Error).message) };
  }
}

/** Supabase caps un-ranged selects at 1000 rows. Paginate anything that can exceed it. */
export async function selectAll<T>(
  supabase: SupabaseLike,
  table: string,
  columns: string,
  build: (q: any) => any,
  pageSize = 1000,
): Promise<{ rows: T[]; error: unknown | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(supabase.from(table).select(columns)).range(from, from + pageSize - 1);
    if (error) return { rows, error };
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return { rows, error: null };
}

export function ageYearsFromMonths(ageMonths: number | null | undefined): number {
  if (!ageMonths || ageMonths <= 0) return 0;
  return Math.floor(ageMonths / 12);
}

/** Whole months between a date of birth and a reference date. Local-date safe. */
export function ageMonthsFromBirthDate(birthDate: string | null, at: Date = new Date()): number | null {
  if (!birthDate) return null;
  const dob = new Date(`${birthDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  let months = (at.getFullYear() - dob.getFullYear()) * 12 + (at.getMonth() - dob.getMonth());
  if (at.getDate() < dob.getDate()) months -= 1;
  return months >= 0 ? months : null;
}
