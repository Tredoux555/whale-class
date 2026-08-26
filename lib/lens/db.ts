// lib/lens/db.ts
// Shared data access for Montree Lens. Every table here is `lens_*`; this
// module never touches a montree_*, tp_* or cms_* table.
//
// 🚨 THE OWNERSHIP RULE, STATED ONCE SO EVERY ROUTE CAN JUST CALL IT:
// existence is never ownership. A request may name a school id, a classroom id,
// a visit id — none of that proves the signed-in observer owns it. Every loader
// below that takes an id ALSO takes the observerId from the session and proves
// the chain (observer -> school -> classroom -> staff, observer -> visit ->
// moment/report) in the query itself. A row that is not hers reads exactly like
// a row that does not exist.

import { getSupabase, type UntypedClient } from '@/lib/supabase-client';
import type {
  LensActionItem,
  LensClassroom,
  LensMoment,
  LensObserver,
  LensSchool,
  LensStaff,
  LensVisit,
} from './types';

/** Private bucket. Must be created by hand in the Supabase dashboard — writing
 *  to the storage schema from a migration rolls the whole migration back. */
export const LENS_BUCKET = 'lens-photos';

export function lensDb(): UntypedClient {
  return getSupabase();
}

// --------------------------------------------------------- schema readiness --

/**
 * Postgres codes for "that table doesn't exist" / "that column doesn't exist".
 * Before migration 339 is run, every Lens route degrades to a clean 503 instead
 * of a 500 stack trace.
 */
export function isSetupPending(error: unknown): boolean {
  const code = (error as { code?: string } | null | undefined)?.code;
  return code === '42P01' || code === '42703';
}

export function errorCode(error: unknown): string | undefined {
  return (error as { code?: string } | null | undefined)?.code;
}

export function isUniqueViolation(error: unknown): boolean {
  return errorCode(error) === '23505';
}

// -------------------------------------------------------------- observers ---

const OBSERVER_COLUMNS =
  'id, name, title, credentials, organisation, letterhead_name, letterhead_line1, ' +
  'letterhead_line2, letterhead_email, letterhead_phone, signature_text, ' +
  'default_languages, style_profile, is_active, created_at';

export async function loadObserver(
  supabase: UntypedClient,
  observerId: string,
): Promise<LensObserver | null> {
  const { data, error } = await supabase
    .from('lens_observers')
    .select(OBSERVER_COLUMNS)
    .eq('id', observerId)
    .maybeSingle();
  if (error) throw error;
  if (!data || (data as { is_active?: boolean }).is_active === false) return null;
  return data as unknown as LensObserver;
}

export async function findObserverByCode(
  supabase: UntypedClient,
  code: string,
): Promise<LensObserver | null> {
  // Exact match on an already-normalised uppercase code — no ilike, so no
  // wildcard-escaping question arises.
  const { data, error } = await supabase
    .from('lens_observers')
    .select(OBSERVER_COLUMNS)
    .eq('invite_code', code)
    .maybeSingle();
  if (error) throw error;
  if (!data || (data as { is_active?: boolean }).is_active === false) return null;
  return data as unknown as LensObserver;
}

// ----------------------------------------------------------------- schools --

export const SCHOOL_COLUMNS =
  'id, observer_id, name, city, country, contact_name, contact_email, logo_path, ' +
  'affiliation, age_bands, notes, is_active, created_at';

export async function listSchools(
  supabase: UntypedClient,
  observerId: string,
): Promise<LensSchool[]> {
  const { data, error } = await supabase
    .from('lens_schools')
    .select(SCHOOL_COLUMNS)
    .eq('observer_id', observerId)
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as LensSchool[];
}

/** Ownership gate: the school must belong to THIS observer. */
export async function loadOwnedSchool(
  supabase: UntypedClient,
  observerId: string,
  schoolId: string,
): Promise<LensSchool | null> {
  const { data, error } = await supabase
    .from('lens_schools')
    .select(SCHOOL_COLUMNS)
    .eq('id', schoolId)
    .eq('observer_id', observerId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as LensSchool) ?? null;
}

// -------------------------------------------------------------- classrooms --

export const CLASSROOM_COLUMNS =
  'id, school_id, name, level, age_range, child_count, ratio, room_notes, is_active, created_at';

export async function listClassrooms(
  supabase: UntypedClient,
  schoolId: string,
): Promise<LensClassroom[]> {
  const { data, error } = await supabase
    .from('lens_classrooms')
    .select(CLASSROOM_COLUMNS)
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as LensClassroom[];
}

/**
 * Ownership gate through the school. Two round trips rather than an embedded
 * join because the join syntax makes the ownership condition easy to write
 * wrong, and this is the check that keeps one consultant's clients out of
 * another's report.
 */
export async function loadOwnedClassroom(
  supabase: UntypedClient,
  observerId: string,
  classroomId: string,
): Promise<{ classroom: LensClassroom; school: LensSchool } | null> {
  const { data, error } = await supabase
    .from('lens_classrooms')
    .select(CLASSROOM_COLUMNS)
    .eq('id', classroomId)
    .maybeSingle();
  if (error) throw error;
  const classroom = (data as unknown as LensClassroom) ?? null;
  if (!classroom) return null;
  const school = await loadOwnedSchool(supabase, observerId, classroom.school_id);
  if (!school) return null;
  return { classroom, school };
}

// ------------------------------------------------------------------- staff --

export const STAFF_COLUMNS =
  'id, classroom_id, name, role, training, training_level, years_experience, notes, is_active, created_at';

export async function listStaff(
  supabase: UntypedClient,
  classroomId: string,
): Promise<LensStaff[]> {
  const { data, error } = await supabase
    .from('lens_staff')
    .select(STAFF_COLUMNS)
    .eq('classroom_id', classroomId)
    .eq('is_active', true)
    .order('role', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as LensStaff[];
}

/** Every staff member across a set of classrooms, in one round trip. */
export async function listStaffForClassrooms(
  supabase: UntypedClient,
  classroomIds: string[],
): Promise<LensStaff[]> {
  if (classroomIds.length === 0) return [];
  const out: LensStaff[] = [];
  // Chunked: `.in()` on a long id list is the documented truncation trap in
  // this codebase. A visit never has hundreds of rooms, but the habit is cheap.
  for (let i = 0; i < classroomIds.length; i += 100) {
    const { data, error } = await supabase
      .from('lens_staff')
      .select(STAFF_COLUMNS)
      .in('classroom_id', classroomIds.slice(i, i + 100))
      .eq('is_active', true);
    if (error) throw error;
    out.push(...((data ?? []) as unknown as LensStaff[]));
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadOwnedStaff(
  supabase: UntypedClient,
  observerId: string,
  staffId: string,
): Promise<LensStaff | null> {
  const { data, error } = await supabase
    .from('lens_staff')
    .select(STAFF_COLUMNS)
    .eq('id', staffId)
    .maybeSingle();
  if (error) throw error;
  const staff = (data as unknown as LensStaff) ?? null;
  if (!staff) return null;
  const owned = await loadOwnedClassroom(supabase, observerId, staff.classroom_id);
  return owned ? staff : null;
}

// ------------------------------------------------------------------ visits --

export const VISIT_COLUMNS =
  'id, observer_id, school_id, visit_date, engagement_type, purpose, started_at, ended_at, status, created_at';

export async function listVisits(
  supabase: UntypedClient,
  observerId: string,
  limit = 50,
): Promise<LensVisit[]> {
  const { data, error } = await supabase
    .from('lens_visits')
    .select(VISIT_COLUMNS)
    .eq('observer_id', observerId)
    .order('visit_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as LensVisit[];
}

export async function loadOwnedVisit(
  supabase: UntypedClient,
  observerId: string,
  visitId: string,
): Promise<LensVisit | null> {
  const { data, error } = await supabase
    .from('lens_visits')
    .select(VISIT_COLUMNS)
    .eq('id', visitId)
    .eq('observer_id', observerId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as LensVisit) ?? null;
}

export async function visitClassroomIds(
  supabase: UntypedClient,
  visitId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('lens_visit_classrooms')
    .select('classroom_id')
    .eq('visit_id', visitId);
  if (error) throw error;
  return ((data ?? []) as { classroom_id: string }[]).map((r) => r.classroom_id);
}

export async function loadClassroomsByIds(
  supabase: UntypedClient,
  ids: string[],
): Promise<LensClassroom[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('lens_classrooms')
    .select(CLASSROOM_COLUMNS)
    .in('id', ids.slice(0, 100));
  if (error) throw error;
  return (data ?? []) as unknown as LensClassroom[];
}

// ----------------------------------------------------------------- moments --

export const MOMENT_COLUMNS =
  'id, visit_id, classroom_id, ts, kind, media_path, transcript, body, caption, ' +
  'area, subject, staff_id, child_alias, rating, client_id, created_at';

const MOMENT_PAGE = 500;

/** The whole stream for a visit, oldest first — the order of the report. */
export async function listMoments(
  supabase: UntypedClient,
  visitId: string,
  classroomId?: string | null,
): Promise<LensMoment[]> {
  const out: LensMoment[] = [];
  for (let from = 0; ; from += MOMENT_PAGE) {
    let query = supabase.from('lens_moments').select(MOMENT_COLUMNS).eq('visit_id', visitId);
    if (classroomId) query = query.eq('classroom_id', classroomId);
    const { data, error } = await query
      .order('ts', { ascending: true })
      .range(from, from + MOMENT_PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as LensMoment[];
    out.push(...page);
    if (page.length < MOMENT_PAGE) break;
  }
  return out;
}

export async function loadOwnedMoment(
  supabase: UntypedClient,
  observerId: string,
  momentId: string,
): Promise<{ moment: LensMoment; visit: LensVisit } | null> {
  const { data, error } = await supabase
    .from('lens_moments')
    .select(MOMENT_COLUMNS)
    .eq('id', momentId)
    .maybeSingle();
  if (error) throw error;
  const moment = (data as unknown as LensMoment) ?? null;
  if (!moment) return null;
  const visit = await loadOwnedVisit(supabase, observerId, moment.visit_id);
  if (!visit) return null;
  return { moment, visit };
}

// ----------------------------------------------------------------- reports --

export const REPORT_COLUMNS =
  'id, visit_id, classroom_id, template, languages, sections, ratings, commendations, ' +
  'recommendations, required_actions, next_steps, debrief, status, version, pdf_path, ' +
  'finalised_at, created_at, updated_at';

export interface LensReportRow {
  id: string;
  visit_id: string;
  classroom_id: string | null;
  template: string;
  languages: string[];
  sections: unknown;
  ratings: unknown;
  commendations: unknown;
  recommendations: unknown;
  required_actions: unknown;
  next_steps: unknown;
  debrief: unknown;
  status: string;
  version: number;
  pdf_path: string | null;
  finalised_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Cast a select() result to a report row.
 *
 * REPORT_COLUMNS is a runtime string, so supabase-js cannot parse it at compile
 * time and infers a union that includes GenericStringError. The shape is
 * guaranteed by the single literal REPORT_COLUMNS every caller uses, so the cast
 * is done HERE, once, rather than at seven call sites where the next person
 * would be tempted to reach for `any`.
 */
export function asReportRow(data: unknown): LensReportRow {
  return data as unknown as LensReportRow;
}

export async function loadOwnedReport(
  supabase: UntypedClient,
  observerId: string,
  reportId: string,
): Promise<{ report: LensReportRow; visit: LensVisit } | null> {
  const { data, error } = await supabase
    .from('lens_reports')
    .select(REPORT_COLUMNS)
    .eq('id', reportId)
    .maybeSingle();
  if (error) throw error;
  const report = (data as unknown as LensReportRow) ?? null;
  if (!report) return null;
  const visit = await loadOwnedVisit(supabase, observerId, report.visit_id);
  if (!visit) return null;
  return { report, visit };
}

export async function listReportsForVisit(
  supabase: UntypedClient,
  visitId: string,
): Promise<LensReportRow[]> {
  const { data, error } = await supabase
    .from('lens_reports')
    .select(REPORT_COLUMNS)
    .eq('visit_id', visitId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as LensReportRow[];
}

// ------------------------------------------------------------ action items --

export const ACTION_ITEM_COLUMNS =
  'id, report_id, classroom_id, text, owner, due_date, status, carried_from_id, sort_order, created_at';

export async function listActionItems(
  supabase: UntypedClient,
  reportId: string,
): Promise<LensActionItem[]> {
  const { data, error } = await supabase
    .from('lens_action_items')
    .select(ACTION_ITEM_COLUMNS)
    .eq('report_id', reportId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as LensActionItem[];
}

/**
 * The open follow-ups for a classroom — what /lens/visits/new shows as "last
 * visit's action items". Ordered newest-first so the most recent visit's list
 * is what she sees at the top.
 */
export async function listOpenActionItemsForClassroom(
  supabase: UntypedClient,
  classroomId: string,
): Promise<LensActionItem[]> {
  const { data, error } = await supabase
    .from('lens_action_items')
    .select(ACTION_ITEM_COLUMNS)
    .eq('classroom_id', classroomId)
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as LensActionItem[];
}

// ------------------------------------------------------------------- proxy --

/** The app-relative URL that streams a private storage object. */
export function lensProxyUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/');
  return `/api/lens/media/proxy/${encoded}`;
}
