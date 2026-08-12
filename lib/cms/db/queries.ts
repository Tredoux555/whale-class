// lib/cms/db/queries.ts
// ============================================================================
// EVERY DATABASE READ AND WRITE THE CMS SURFACE MAKES. There is no other one.
// ============================================================================
// Pages and routes call these functions; nothing in app/cms/** or
// app/api/cms/** touches supabase-js directly. That is what keeps the pages
// swappable between demo seed and live rows, and it is what makes the "does the
// engine stay pure?" question answerable: the engine takes records, and this
// file is the only thing that can produce them from a database.
//
// TENANCY: every query is scoped by the session's schoolId (or, for a parent,
// their guardianId) — never by an id supplied in a request body. Montree's own
// audit found derived tenancy to be the single most common source of
// cross-tenant leaks, and this repo has fixed exactly that bug before (the
// cross-tenant child-creation incident, Jul 3 2026: existence ≠ ownership).
//
// The client is the SERVICE ROLE (lib/supabase-client.ts getSupabase), the same
// as every other server module in this repo. It bypasses RLS, so the scoping
// below is the primary gate and migration 329's policies are the second line.
// ============================================================================

import { getSupabase, type UntypedClient } from '@/lib/supabase-client';
import { safeErrorLog } from '@/lib/api-error';
import type { CmsSession } from '@/lib/cms/auth/session';
import type { DailyFacts } from '@/lib/cms/engine/roster';
import type {
  Allergy,
  ChildId,
  Child,
  ClassGroup,
  DietaryRequirement,
  Guardian,
  MedicalRecord,
  School,
  SchoolSummary,
} from '@/lib/cms/engine/types';
import type {
  normaliseAboutChildStep,
  normaliseConsentsStep,
  normaliseContactsStep,
  normaliseDietaryStep,
  normaliseMedicalStep,
  normalisePreviousSchoolStep,
  normaliseRosterChild,
  normaliseRosterImport,
} from '@/lib/cms/validation';

import {
  mapAllergy,
  mapChild,
  mapClassGroup,
  mapDailyFacts,
  mapDietary,
  mapMedical,
  mapSchool,
  type Row,
} from './mappers';

function db(): UntypedClient {
  return getSupabase();
}

/** Everything the parent dashboard and the teacher roster both need. */
export interface ChildBundle {
  children: Child[];
  allergies: Allergy[];
  dietary: DietaryRequirement[];
  medical: MedicalRecord[];
}

const EMPTY_BUNDLE: ChildBundle = {
  children: [],
  allergies: [],
  dietary: [],
  medical: [],
};

/**
 * Hydrate a set of child rows with their guardians, allergies, diet and medical
 * record. One query per table, never one per child — a room of 24 children must
 * cost 4 round trips, not 96.
 */
async function hydrateChildren(childRows: Row[]): Promise<ChildBundle> {
  if (childRows.length === 0) return EMPTY_BUNDLE;
  const supabase = db();
  const childIds = childRows.map((c) => c.id);

  const [linkRes, allergyRes, dietRes, medicalRes] = await Promise.all([
    supabase
      .from('cms_child_guardians')
      .select('child_id, guardian_id, is_primary, can_collect')
      .in('child_id', childIds),
    supabase.from('cms_allergies').select('*').in('child_id', childIds).is('deleted_at', null),
    supabase
      .from('cms_dietary_requirements')
      .select('*')
      .in('child_id', childIds)
      .is('deleted_at', null),
    supabase
      .from('cms_medical_records')
      .select('*')
      .in('child_id', childIds)
      .is('deleted_at', null),
  ]);

  const links: Row[] = linkRes.data ?? [];
  const guardianIds = Array.from(new Set(links.map((l) => l.guardian_id)));
  const guardianRes = guardianIds.length
    ? await supabase
        .from('cms_guardians')
        .select('*')
        .in('id', guardianIds)
        .is('deleted_at', null)
    : { data: [] as Row[] };

  const guardianById = new Map<string, Row>(
    (guardianRes.data ?? []).map((g: Row) => [g.id, g])
  );
  const linksByChild = new Map<string, Row[]>();
  for (const link of links) {
    const list = linksByChild.get(link.child_id) ?? [];
    list.push(link);
    linksByChild.set(link.child_id, list);
  }

  const children = childRows.map((row) => {
    const childLinks = (linksByChild.get(row.id) ?? []).slice().sort((a, b) => {
      // Primary guardian first; the engine and every document treat
      // guardians[0] as "the person you call".
      if (a.is_primary === b.is_primary) return 0;
      return a.is_primary ? -1 : 1;
    });
    const guardianRows = childLinks
      .map((l) => guardianById.get(l.guardian_id))
      .filter((g): g is Row => Boolean(g));
    return mapChild(row, guardianRows, childLinks);
  });

  return {
    children,
    allergies: (allergyRes.data ?? []).map(mapAllergy),
    dietary: (dietRes.data ?? []).map(mapDietary),
    medical: (medicalRes.data ?? []).map(mapMedical),
  };
}

// ── parent side ─────────────────────────────────────────────────────────────

/**
 * The children this parent guards. Scoped by the session's guardianId, so the
 * question "whose children are these?" is answered by the SESSION, never by
 * anything the browser sent.
 */
export async function loadParentChildren(session: CmsSession): Promise<ChildBundle> {
  if (!session.guardianId) return EMPTY_BUNDLE;
  try {
    const supabase = db();
    const { data: links } = await supabase
      .from('cms_child_guardians')
      .select('child_id')
      .eq('guardian_id', session.guardianId);

    const childIds = (links ?? []).map((l: Row) => l.child_id);
    if (childIds.length === 0) return EMPTY_BUNDLE;

    const { data: childRows } = await supabase
      .from('cms_children')
      .select('*')
      .in('id', childIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    return hydrateChildren(childRows ?? []);
  } catch (error) {
    safeErrorLog('cms/db/loadParentChildren', error);
    return EMPTY_BUNDLE;
  }
}

/** The rooms a family may apply to. Drives the enrolment wizard's room select. */
export async function loadClassGroups(schoolId: string): Promise<ClassGroup[]> {
  try {
    const { data } = await db()
      .from('cms_class_groups')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });
    return (data ?? []).map(mapClassGroup);
  } catch (error) {
    safeErrorLog('cms/db/loadClassGroups', error);
    return [];
  }
}

// ── enrolment ───────────────────────────────────────────────────────────────

/** The wizard's resumable state: one draft, its child, and what's been done. */
export interface EnrollmentDraft {
  enrollmentId: string;
  childId: string;
  status: string;
  completedSteps: string[];
  child: {
    legalName: string;
    preferredName: string;
    dateOfBirth: string;
    homeLanguage: string;
  };
  requestedClassGroupId: string | null;
  requestedStartDate: string | null;
  settlingNotes: string | null;
  /** Whatever steps 2–6 have parked, keyed by step name. */
  draftData: Record<string, unknown>;
}

/**
 * The family's open draft, if they have one. A parent has at most one draft per
 * child (a partial unique index enforces it), and the wizard resumes the most
 * recently touched.
 */
export async function loadOpenDraft(
  session: CmsSession
): Promise<EnrollmentDraft | null> {
  if (!session.guardianId) return null;
  try {
    const supabase = db();
    const { data: links } = await supabase
      .from('cms_child_guardians')
      .select('child_id')
      .eq('guardian_id', session.guardianId);
    const childIds = (links ?? []).map((l: Row) => l.child_id);
    if (childIds.length === 0) return null;

    const { data: rows } = await supabase
      .from('cms_enrollments')
      .select('*')
      .in('child_id', childIds)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(1);

    const enrollment: Row | undefined = (rows ?? [])[0];
    if (!enrollment) return null;

    const { data: child } = await supabase
      .from('cms_children')
      .select('*')
      .eq('id', enrollment.child_id)
      .maybeSingle();
    if (!child) return null;

    return {
      enrollmentId: enrollment.id,
      childId: enrollment.child_id,
      status: enrollment.status,
      completedSteps: Array.isArray(enrollment.completed_steps)
        ? enrollment.completed_steps
        : [],
      child: {
        legalName: child.legal_name ?? '',
        preferredName: child.preferred_name ?? '',
        dateOfBirth: child.date_of_birth ?? '',
        homeLanguage: child.home_language ?? '',
      },
      requestedClassGroupId: enrollment.requested_class_group_id ?? null,
      requestedStartDate: enrollment.requested_start_date ?? null,
      settlingNotes: enrollment.settling_notes ?? null,
      draftData:
        enrollment.draft_data && typeof enrollment.draft_data === 'object'
          ? enrollment.draft_data
          : {},
    };
  } catch (error) {
    safeErrorLog('cms/db/loadOpenDraft', error);
    return null;
  }
}

export interface ChildStepInput {
  legalName: string;
  preferredName: string;
  dateOfBirth: string;
  homeLanguage: string;
  requestedStartDate: string | null;
  classGroupId: string | null;
  settlingNotes: string | null;
}

export interface SaveChildStepResult {
  ok: boolean;
  enrollmentId?: string;
  childId?: string;
  error?: string;
}

/**
 * WIZARD STEP 1 — the write that makes an enrolment real.
 *
 * Creates (or updates) three rows in one logical move:
 *   cms_children          the child
 *   cms_child_guardians   the link that makes the child THIS family's
 *   cms_enrollments       a draft application
 *
 * Idempotent by design: called again with the same session it UPDATES the open
 * draft rather than creating a second child. A parent who taps "Save" twice, or
 * comes back tomorrow to fix a spelling, must not end up with twins.
 *
 * The child row is stamped with created_by_user_id = the signed-in user. That
 * column is load-bearing for RLS (migration 329: it is what lets a family claim
 * the child they just created and nobody else's), so it is set here, always.
 */
export async function saveChildStep(
  session: CmsSession,
  input: ChildStepInput
): Promise<SaveChildStepResult> {
  if (!session.guardianId || !session.schoolId) {
    return { ok: false, error: 'no_guardian' };
  }
  const supabase = db();

  try {
    // A requested room must belong to the session's school. This is the
    // "existence ≠ ownership" rule the Jul-3 cross-tenant incident was about:
    // never trust a client-supplied id to name its own tenant.
    let classGroupId: string | null = null;
    if (input.classGroupId) {
      const { data: room } = await supabase
        .from('cms_class_groups')
        .select('id, school_id')
        .eq('id', input.classGroupId)
        .maybeSingle();
      if (!room || room.school_id !== session.schoolId) {
        return { ok: false, error: 'invalid_class_group' };
      }
      classGroupId = room.id;
    }

    const existing = await loadOpenDraft(session);

    const childPatch = {
      legal_name: input.legalName,
      preferred_name: input.preferredName || input.legalName,
      date_of_birth: input.dateOfBirth,
      home_language: input.homeLanguage || 'en',
      class_group_id: classGroupId,
    };

    let childId: string;
    if (existing) {
      childId = existing.childId;
      const { error } = await supabase
        .from('cms_children')
        .update(childPatch)
        .eq('id', childId)
        .eq('school_id', session.schoolId); // tenancy belt-and-braces
      if (error) throw error;
    } else {
      const { data: created, error } = await supabase
        .from('cms_children')
        .insert({
          ...childPatch,
          school_id: session.schoolId,
          created_by_user_id: session.userId,
        })
        .select('id')
        .single();
      if (error) throw error;
      childId = created.id;

      const { error: linkError } = await supabase.from('cms_child_guardians').insert({
        child_id: childId,
        guardian_id: session.guardianId,
        is_primary: true,
        can_collect: true,
      });
      if (linkError) throw linkError;
    }

    const enrollmentPatch = {
      requested_class_group_id: classGroupId,
      requested_start_date: input.requestedStartDate || null,
      settling_notes: input.settlingNotes || null,
    };

    if (existing) {
      const completed = new Set(existing.completedSteps);
      completed.add('child');
      const { error } = await supabase
        .from('cms_enrollments')
        .update({ ...enrollmentPatch, completed_steps: Array.from(completed) })
        .eq('id', existing.enrollmentId)
        .eq('status', 'draft'); // a submitted form is evidence — never rewritten
      if (error) throw error;
      return { ok: true, enrollmentId: existing.enrollmentId, childId };
    }

    const { data: enrollment, error: enrollError } = await supabase
      .from('cms_enrollments')
      .insert({
        ...enrollmentPatch,
        child_id: childId,
        school_id: session.schoolId,
        status: 'draft',
        completed_steps: ['child'],
        created_by_user_id: session.userId,
      })
      .select('id')
      .single();
    if (enrollError) throw enrollError;

    return { ok: true, enrollmentId: enrollment.id, childId };
  } catch (error) {
    safeErrorLog('cms/db/saveChildStep', error);
    return { ok: false, error: 'write_failed' };
  }
}

/**
 * STEPS 2–6 — park whatever a scaffold step has captured so the family can
 * leave and come back. Merged, not replaced: saving the dietary step must not
 * wipe what the medical step collected.
 */
export async function saveDraftStep(
  session: CmsSession,
  step: string,
  payload: Record<string, unknown>,
  markComplete: boolean
): Promise<SaveChildStepResult> {
  const existing = await loadOpenDraft(session);
  if (!existing) return { ok: false, error: 'no_draft' };
  try {
    const completed = new Set(existing.completedSteps);
    if (markComplete) completed.add(step);
    const { error } = await db()
      .from('cms_enrollments')
      .update({
        draft_data: { ...existing.draftData, [step]: payload },
        completed_steps: Array.from(completed),
      })
      .eq('id', existing.enrollmentId)
      .eq('status', 'draft');
    if (error) throw error;
    return { ok: true, enrollmentId: existing.enrollmentId, childId: existing.childId };
  } catch (error) {
    safeErrorLog('cms/db/saveDraftStep', error);
    return { ok: false, error: 'write_failed' };
  }
}

// ── teacher side ────────────────────────────────────────────────────────────

export interface TeacherRosterData {
  school: School;
  classGroup: ClassGroup;
  children: Child[];
  allergies: Allergy[];
  dietary: DietaryRequirement[];
  medical: MedicalRecord[];
  daily: DailyFacts[];
}

/**
 * Everything `buildDailyRoster` needs for one room on one day — assembled here
 * and handed to the engine as plain records.
 *
 * 🚨 The engine's signature does not change for live mode. buildDailyRoster
 * still takes a RosterInput and RosterLabels and still knows nothing about
 * Supabase; this function's whole job is to make the argument. That is the
 * hourglass working as designed — swap the seed for rows, the engine is
 * untouched.
 *
 * A teacher with no room assignment gets null, not somebody else's room.
 */
export async function loadTeacherRoster(
  session: CmsSession,
  onDate: string
): Promise<TeacherRosterData | null> {
  if (!session.schoolId) return null;
  try {
    const supabase = db();

    // Which room? A teacher's assignment (cms_class_teachers); a school_admin
    // covering the floor falls back to the school's first room.
    let classGroupRow: Row | null = null;
    const { data: assignments } = await supabase
      .from('cms_class_teachers')
      .select('class_group_id')
      .eq('membership_id', session.membershipId);

    const assignedIds = (assignments ?? []).map((a: Row) => a.class_group_id);
    if (assignedIds.length > 0) {
      const { data } = await supabase
        .from('cms_class_groups')
        .select('*')
        .in('id', assignedIds)
        .eq('school_id', session.schoolId)
        .order('name', { ascending: true })
        .limit(1);
      classGroupRow = (data ?? [])[0] ?? null;
    } else if (session.role === 'school_admin') {
      const { data } = await supabase
        .from('cms_class_groups')
        .select('*')
        .eq('school_id', session.schoolId)
        .order('name', { ascending: true })
        .limit(1);
      classGroupRow = (data ?? [])[0] ?? null;
    }
    if (!classGroupRow) return null;

    const [schoolRes, childRes, attendanceRes] = await Promise.all([
      supabase.from('cms_schools').select('*').eq('id', session.schoolId).maybeSingle(),
      supabase
        .from('cms_children')
        .select('*')
        .eq('class_group_id', classGroupRow.id)
        .is('deleted_at', null)
        .order('preferred_name', { ascending: true }),
      supabase
        .from('cms_attendance')
        .select('*')
        .eq('class_group_id', classGroupRow.id)
        .eq('on_date', onDate),
    ]);

    if (!schoolRes.data) return null;
    const bundle = await hydrateChildren(childRes.data ?? []);

    return {
      school: mapSchool(schoolRes.data),
      classGroup: mapClassGroup(classGroupRow),
      ...bundle,
      daily: (attendanceRes.data ?? []).map(mapDailyFacts),
    };
  } catch (error) {
    safeErrorLog('cms/db/loadTeacherRoster', error);
    return null;
  }
}

// ── org side ────────────────────────────────────────────────────────────────

/**
 * One line per school in the group. Counts only — the org layer sees how many
 * allergy flags a school carries, never whose they are (migration 329 enforces
 * the same rule at the row level: no org read on cms_medical_records).
 */
export async function loadSchoolSummaries(
  session: CmsSession
): Promise<SchoolSummary[]> {
  try {
    const supabase = db();
    const { data: schools } = await supabase
      .from('cms_schools')
      .select('*')
      .eq('organisation_id', session.organisationId)
      .order('name', { ascending: true });

    const rows: Row[] = schools ?? [];
    if (rows.length === 0) return [];

    return await Promise.all(
      rows.map(async (row) => {
        const [children, classes, allergies, enrolments] = await Promise.all([
          supabase
            .from('cms_children')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', row.id)
            .is('deleted_at', null),
          supabase
            .from('cms_class_groups')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', row.id),
          supabase
            .from('cms_allergies')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', row.id)
            .is('deleted_at', null),
          supabase
            .from('cms_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', row.id)
            .in('status', ['submitted', 'in_review', 'waitlisted']),
        ]);
        return {
          school: mapSchool(row),
          childCount: children.count ?? 0,
          classGroupCount: classes.count ?? 0,
          allergyFlagCount: allergies.count ?? 0,
          openEnrollmentCount: enrolments.count ?? 0,
        };
      })
    );
  } catch (error) {
    safeErrorLog('cms/db/loadSchoolSummaries', error);
    return [];
  }
}

// ── identity (used by the auth routes) ──────────────────────────────────────

export interface CmsUserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  is_active: boolean;
}

export async function findCmsUserByEmail(email: string): Promise<CmsUserRow | null> {
  try {
    const { data } = await db()
      .from('cms_users')
      .select('id, email, password_hash, display_name, is_active')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    return data ?? null;
  } catch (error) {
    safeErrorLog('cms/db/findCmsUserByEmail', error);
    return null;
  }
}

export interface MembershipRow {
  id: string;
  role: 'org_admin' | 'school_admin' | 'teacher' | 'parent';
  organisation_id: string;
  school_id: string | null;
  guardian_id: string | null;
  email: string;
  display_name: string;
}

/**
 * The person's active memberships, staff first.
 *
 * Order matters: a human who is both a teacher and a parent at the same school
 * holds two rows, and signing in should land them on the side they were hired
 * for. They can still walk to the parent side — the gate lets a school_admin
 * and lets a parent be a parent — but the default has to pick one.
 */
export async function loadMemberships(userId: string): Promise<MembershipRow[]> {
  try {
    const { data } = await db()
      .from('cms_memberships')
      .select('id, role, organisation_id, school_id, guardian_id, email, display_name')
      .eq('user_id', userId)
      .eq('is_active', true);
    const order: Record<string, number> = {
      org_admin: 0,
      school_admin: 1,
      teacher: 2,
      parent: 3,
    };
    return (data ?? []).sort(
      (a: MembershipRow, b: MembershipRow) => (order[a.role] ?? 9) - (order[b.role] ?? 9)
    );
  } catch (error) {
    safeErrorLog('cms/db/loadMemberships', error);
    return [];
  }
}

/** Child ids for a set of children — small helper the API route uses. */
export function childIdsOf(children: Child[]): ChildId[] {
  return children.map((c) => c.id);
}

// ============================================================================
// PHASE 3 — the rest of the wizard writes
// ============================================================================
// Steps 2–7 stop parking their answers in `draft_data` and start writing their
// own tables. Every one of them follows the SAME three-part move:
//
//   1. find the family's open draft (which is the only way this file learns a
//      child id — never from the request body),
//   2. write the step's real rows,
//   3. park the raw form values in `draft_data` AND mark the step complete, so
//      the wizard can rehydrate the exact form the family left behind.
//
// Step 3 is not redundant with step 2. The typed rows are the RECORD; the
// parked blob is the FORM. A family that half-filled an allergy row and left
// must get their half-filled row back, and no set of clean allergy rows can
// reconstruct it.
//
// 🚨 LIST STEPS REPLACE, THEY DO NOT APPEND. The wizard always sends the whole
// list, so saving twice must not double a child's allergies. Old rows are
// soft-deleted (`deleted_at`), never hard-deleted — a removed allergy is a
// clinically interesting fact and every read path already filters on it.

type AboutChildInput = ReturnType<typeof normaliseAboutChildStep>;
type MedicalInput = ReturnType<typeof normaliseMedicalStep>;
type DietaryInput = ReturnType<typeof normaliseDietaryStep>;
type PreviousSchoolInput = ReturnType<typeof normalisePreviousSchoolStep>;
type ContactsInput = ReturnType<typeof normaliseContactsStep>;
type ConsentsInput = ReturnType<typeof normaliseConsentsStep>;

/** The three things every phase-3 write needs, or a reason it cannot proceed. */
async function requireDraft(
  session: CmsSession
): Promise<
  | { ok: true; draft: EnrollmentDraft; schoolId: string }
  | { ok: false; error: string }
> {
  if (!session.schoolId) return { ok: false, error: 'no_school' };
  const draft = await loadOpenDraft(session);
  // No draft means step 1 has not been saved. The wizard enforces the order,
  // but a direct POST must not be able to create an orphan medical record.
  if (!draft) return { ok: false, error: 'no_draft' };
  return { ok: true, draft, schoolId: session.schoolId };
}

/** Park the raw form values and tick the step. Called after every typed write. */
async function completeStep(
  session: CmsSession,
  step: string,
  raw: Record<string, unknown>
): Promise<void> {
  await saveDraftStep(session, step, raw, true);
}

// ── step 2 · about your child ───────────────────────────────────────────────

/**
 * One profile per child (the table has a UNIQUE on child_id), so this is an
 * update-or-insert rather than an append. `guru_synced_at` is stamped only when
 * the family leaves the sync tick in place — it is the audit trail for "when
 * did this profile become visible to the planning assistant".
 */
export async function saveAboutChildStep(
  session: CmsSession,
  input: AboutChildInput,
  raw: Record<string, unknown>
): Promise<SaveChildStepResult> {
  const gate = await requireDraft(session);
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const supabase = db();
    const patch = {
      likes: input.likes,
      dislikes: input.dislikes,
      interests: input.interests,
      temperament: input.temperament,
      parent_notes: input.parentNotes,
      guru_sync: input.guruSync,
      guru_synced_at: input.guruSync ? new Date().toISOString() : null,
      deleted_at: null,
    };

    const { data: existing } = await supabase
      .from('cms_child_profiles')
      .select('id')
      .eq('child_id', gate.draft.childId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('cms_child_profiles')
        .update(patch)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('cms_child_profiles').insert({
        ...patch,
        child_id: gate.draft.childId,
        school_id: gate.schoolId,
      });
      if (error) throw error;
    }

    await completeStep(session, 'about_child', raw);
    return { ok: true, enrollmentId: gate.draft.enrollmentId, childId: gate.draft.childId };
  } catch (error) {
    safeErrorLog('cms/db/saveAboutChildStep', error);
    return { ok: false, error: 'write_failed' };
  }
}

// ── step 3 · medical & allergies ────────────────────────────────────────────

export async function saveMedicalStep(
  session: CmsSession,
  input: MedicalInput,
  raw: Record<string, unknown>
): Promise<SaveChildStepResult> {
  const gate = await requireDraft(session);
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const supabase = db();
    const childId = gate.draft.childId;

    const medicalPatch = {
      conditions: input.conditions,
      doctor_name: input.doctorName,
      doctor_phone: input.doctorPhone,
      emergency_note: input.emergencyNote,
      deleted_at: null,
    };
    const { data: existingMedical } = await supabase
      .from('cms_medical_records')
      .select('id')
      .eq('child_id', childId)
      .maybeSingle();

    if (existingMedical) {
      const { error } = await supabase
        .from('cms_medical_records')
        .update(medicalPatch)
        .eq('id', existingMedical.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('cms_medical_records')
        .insert({ ...medicalPatch, child_id: childId, school_id: gate.schoolId });
      if (error) throw error;
    }

    // Replace, don't append — see the header.
    const { error: clearError } = await supabase
      .from('cms_allergies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('child_id', childId)
      .is('deleted_at', null);
    if (clearError) throw clearError;

    if (input.allergies.length > 0) {
      const { error } = await supabase.from('cms_allergies').insert(
        input.allergies.map((row) => ({
          child_id: childId,
          school_id: gate.schoolId,
          allergen: row.allergen,
          severity: row.severity,
          reaction: row.reaction,
          response_plan: row.responsePlan,
          carries_epipen: row.carriesEpipen,
          requires_poster: row.requiresPoster,
        }))
      );
      if (error) throw error;
    }

    await completeStep(session, 'medical', raw);
    return { ok: true, enrollmentId: gate.draft.enrollmentId, childId };
  } catch (error) {
    safeErrorLog('cms/db/saveMedicalStep', error);
    return { ok: false, error: 'write_failed' };
  }
}

// ── step 4 · dietary ────────────────────────────────────────────────────────

export async function saveDietaryStep(
  session: CmsSession,
  input: DietaryInput,
  raw: Record<string, unknown>
): Promise<SaveChildStepResult> {
  const gate = await requireDraft(session);
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const supabase = db();
    const childId = gate.draft.childId;

    const { error: clearError } = await supabase
      .from('cms_dietary_requirements')
      .update({ deleted_at: new Date().toISOString() })
      .eq('child_id', childId)
      .is('deleted_at', null);
    if (clearError) throw clearError;

    if (input.requirements.length > 0) {
      const { error } = await supabase.from('cms_dietary_requirements').insert(
        input.requirements.map((row) => ({
          child_id: childId,
          school_id: gate.schoolId,
          label: row.label,
          reason: row.reason,
          excluded_foods: row.excludedFoods,
          notes: row.notes,
        }))
      );
      if (error) throw error;
    }

    await completeStep(session, 'dietary', raw);
    return { ok: true, enrollmentId: gate.draft.enrollmentId, childId };
  } catch (error) {
    safeErrorLog('cms/db/saveDietaryStep', error);
    return { ok: false, error: 'write_failed' };
  }
}

// ── step 5 · previous school ────────────────────────────────────────────────

export async function savePreviousSchoolStep(
  session: CmsSession,
  input: PreviousSchoolInput,
  raw: Record<string, unknown>
): Promise<SaveChildStepResult> {
  const gate = await requireDraft(session);
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const supabase = db();
    const childId = gate.draft.childId;

    const { error: clearError } = await supabase
      .from('cms_previous_schools')
      .update({ deleted_at: new Date().toISOString() })
      .eq('child_id', childId)
      .is('deleted_at', null);
    if (clearError) throw clearError;

    if (input.schools.length > 0) {
      const { error } = await supabase.from('cms_previous_schools').insert(
        input.schools.map((row) => ({
          child_id: childId,
          school_id: gate.schoolId,
          name: row.name,
          country_code: row.countryCode,
          city: row.city,
          attended_from: row.attendedFrom,
          attended_to: row.attendedTo,
          notes: row.notes,
        }))
      );
      if (error) throw error;
    }

    // "This is their first setting" is an ANSWER, not an absence, and the only
    // place it can live is the enrolment's own record of the step.
    await completeStep(session, 'previous_school', raw);
    return { ok: true, enrollmentId: gate.draft.enrollmentId, childId };
  } catch (error) {
    safeErrorLog('cms/db/savePreviousSchoolStep', error);
    return { ok: false, error: 'write_failed' };
  }
}

// ── step 6 · contacts & pickup ──────────────────────────────────────────────

/**
 * Emergency contacts become `cms_guardians` rows linked to the child, and the
 * ones the family ticked as collectors additionally get a
 * `cms_pickup_authorizations` row.
 *
 * 🚨 THE ACCOUNT HOLDER'S OWN GUARDIAN ROW IS NEVER TOUCHED. `session.guardianId`
 * is what makes this family's children theirs (it is the spine of every
 * parent-side RLS policy), so it is excluded from the replace: rewriting the
 * contacts list must not be able to orphan the child from the person filling in
 * the form.
 */
export async function saveContactsStep(
  session: CmsSession,
  input: ContactsInput,
  raw: Record<string, unknown>
): Promise<SaveChildStepResult> {
  const gate = await requireDraft(session);
  if (!gate.ok) return { ok: false, error: gate.error };
  if (!session.guardianId) return { ok: false, error: 'no_guardian' };
  try {
    const supabase = db();
    const childId = gate.draft.childId;

    const { data: links } = await supabase
      .from('cms_child_guardians')
      .select('guardian_id')
      .eq('child_id', childId);
    const previousIds = (links ?? [])
      .map((l: Row) => l.guardian_id as string)
      .filter((id) => id !== session.guardianId);

    if (previousIds.length > 0) {
      // Drop the links first: the link is what "this person belongs to this
      // child" means, and a stale link with a soft-deleted guardian would read
      // as a missing contact rather than a removed one.
      await supabase
        .from('cms_child_guardians')
        .delete()
        .eq('child_id', childId)
        .in('guardian_id', previousIds);
      await supabase
        .from('cms_pickup_authorizations')
        .delete()
        .eq('child_id', childId)
        .in('guardian_id', previousIds);
      await supabase
        .from('cms_guardians')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', previousIds)
        .eq('school_id', gate.schoolId); // tenancy belt-and-braces
    }

    for (const contact of input.contacts) {
      const { data: created, error } = await supabase
        .from('cms_guardians')
        .insert({
          school_id: gate.schoolId,
          full_name: contact.fullName,
          relationship: contact.relationship,
          phone: contact.phone,
          email: contact.email,
          can_collect: contact.canCollect,
          contact_priority: contact.contactPriority,
        })
        .select('id')
        .single();
      if (error) throw error;

      const { error: linkError } = await supabase.from('cms_child_guardians').insert({
        child_id: childId,
        guardian_id: created.id,
        is_primary: false,
        can_collect: contact.canCollect,
      });
      if (linkError) throw linkError;

      // A permission, not a relationship — only for the people actually ticked.
      if (contact.canCollect) {
        const { error: pickupError } = await supabase.from('cms_pickup_authorizations').insert({
          child_id: childId,
          school_id: gate.schoolId,
          guardian_id: created.id,
          authorised: true,
          note: contact.note,
        });
        if (pickupError) throw pickupError;
      }
    }

    await completeStep(session, 'contacts', raw);
    return { ok: true, enrollmentId: gate.draft.enrollmentId, childId };
  } catch (error) {
    safeErrorLog('cms/db/saveContactsStep', error);
    return { ok: false, error: 'write_failed' };
  }
}

// ── step 7 · consents ───────────────────────────────────────────────────────

/**
 * One row per kind, granted true or false — never "no row for a refusal".
 * `lib/cms/engine/photo-filter.ts` reads a missing row as refusal, so writing
 * the explicit false is what makes the difference between "they said no" and
 * "we never asked", which is exactly the distinction an audit needs.
 */
export async function saveConsentsStep(
  session: CmsSession,
  input: ConsentsInput,
  raw: Record<string, unknown>
): Promise<SaveChildStepResult> {
  const gate = await requireDraft(session);
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const supabase = db();
    const childId = gate.draft.childId;
    const now = new Date().toISOString();

    for (const consent of input.consents) {
      const { data: existing } = await supabase
        .from('cms_consents')
        .select('id')
        .eq('child_id', childId)
        .eq('kind', consent.kind)
        .maybeSingle();

      const patch = {
        granted: consent.granted,
        granted_by_guardian_id: consent.granted ? session.guardianId : null,
        granted_at: consent.granted ? now : null,
      };

      if (existing) {
        const { error } = await supabase.from('cms_consents').update(patch).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cms_consents')
          .insert({ ...patch, child_id: childId, school_id: gate.schoolId, kind: consent.kind });
        if (error) throw error;
      }
    }

    await completeStep(session, 'consents', raw);
    return { ok: true, enrollmentId: gate.draft.enrollmentId, childId };
  } catch (error) {
    safeErrorLog('cms/db/saveConsentsStep', error);
    return { ok: false, error: 'write_failed' };
  }
}

// ── the one-way door ────────────────────────────────────────────────────────

export interface SubmitResult {
  ok: boolean;
  enrollmentId?: string;
  error?: string;
  /** Steps still missing, when the submit was refused for that reason. */
  missing?: string[];
}

/**
 * Draft → submitted. This is the moment the family's write access ends: the
 * RLS update policy on cms_enrollments requires `status = 'draft'` in its USING
 * clause, so once this commits a parent can read the application forever and
 * edit it never. The lock is in the database, not in the UI.
 *
 * Refuses on a half-finished form. The wizard walks the steps in order and will
 * not reach this button early, but a direct POST must not be able to submit an
 * application with no emergency contact on it.
 */
export async function submitEnrollment(session: CmsSession): Promise<SubmitResult> {
  const gate = await requireDraft(session);
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const required = ['child', 'about_child', 'medical', 'dietary', 'previous_school', 'contacts', 'consents'];
    const done = new Set(gate.draft.completedSteps);
    const missing = required.filter((step) => !done.has(step));
    if (missing.length > 0) return { ok: false, error: 'incomplete', missing };

    const { error } = await db()
      .from('cms_enrollments')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', gate.draft.enrollmentId)
      .eq('status', 'draft'); // idempotent: a double-tap cannot re-stamp the date
    if (error) throw error;

    return { ok: true, enrollmentId: gate.draft.enrollmentId };
  } catch (error) {
    safeErrorLog('cms/db/submitEnrollment', error);
    return { ok: false, error: 'write_failed' };
  }
}

// ── teacher insight ─────────────────────────────────────────────────────────

/** What the teacher's insight panel shows. Nothing clinical, nothing derived. */
export interface ChildProfileSummary {
  childId: string;
  likes: string[];
  dislikes: string[];
  interests: string[];
  temperament: Record<string, number>;
  parentNotes: string | null;
}

/**
 * Profiles for a room's children, in ONE query — a room of 24 costs one round
 * trip, not 24. Scoped by the child ids the caller already resolved from their
 * own room, so this function cannot widen anybody's view.
 */
export async function loadChildProfiles(childIds: string[]): Promise<Map<string, ChildProfileSummary>> {
  const out = new Map<string, ChildProfileSummary>();
  if (childIds.length === 0) return out;
  try {
    const { data } = await db()
      .from('cms_child_profiles')
      .select('child_id, likes, dislikes, interests, temperament, parent_notes')
      .in('child_id', childIds)
      .is('deleted_at', null);
    for (const row of (data ?? []) as Row[]) {
      out.set(row.child_id, {
        childId: row.child_id,
        likes: Array.isArray(row.likes) ? row.likes : [],
        dislikes: Array.isArray(row.dislikes) ? row.dislikes : [],
        interests: Array.isArray(row.interests) ? row.interests : [],
        temperament:
          row.temperament && typeof row.temperament === 'object' ? row.temperament : {},
        parentNotes: row.parent_notes ?? null,
      });
    }
    return out;
  } catch (error) {
    // A missing table (migration 330 not yet run) must not take down Today.
    safeErrorLog('cms/db/loadChildProfiles', error);
    return out;
  }
}

// ============================================================================
// PHASE 4 — THE TEACHER'S ROSTER
// ============================================================================
// The one place in CMS where a member of STAFF writes a child's standing
// record. Everything below obeys the same two rules as the enrolment writes
// above, and one more that is new:
//
//   1. TENANCY COMES FROM THE SESSION. A `classGroupId` in a request body is a
//      REQUEST, never a fact — `resolveTeacherRoom` re-derives the rooms this
//      membership actually teaches and refuses anything else. A `childId` is
//      re-checked against those rooms the same way.
//   2. LIST STEPS REPLACE. Allergies, dietary rows and contacts are sent whole
//      and replace the previous set (soft-delete + insert), exactly as the
//      wizard does. Saving twice must not double a child's allergies.
//   3. 🚨 NEW — A TEACHER MAY ONLY EDIT AN UNCLAIMED RECORD. The moment a
//      family account owns the child (a guardian linked to an ACTIVE PARENT
//      MEMBERSHIP), the teacher goes back to read-only and the parent's words
//      win. `loadChildOwnership` is the app-layer half of that rule; migration
//      331's `cms_staff_entered_child_ids()` is the database half. Both exist
//      on purpose: the app scopes, RLS defends.
//
// Note what is NOT here: no medical record write, no child profile write, no
// enrolment. A teacher records what they can SEE (a name, an allergen at the
// gate, who collects) — not a diagnosis and not the family's own words.

/** One room a member of staff may stand in. */
export interface TeacherRoom {
  classGroup: ClassGroup;
  /** True when this is a `cms_class_teachers` assignment rather than an
   *  admin's school-wide reach — the roster page says which. */
  assigned: boolean;
}

/**
 * Every room this session may work in, in name order.
 *
 * A TEACHER gets exactly their `cms_class_teachers` assignments (none → an
 * empty list, and the page says so rather than showing somebody else's room).
 * A SCHOOL_ADMIN covering the floor gets every room in their school.
 */
export async function loadTeacherRooms(session: CmsSession): Promise<TeacherRoom[]> {
  if (!session.schoolId) return [];
  try {
    const supabase = db();
    const { data: assignments } = await supabase
      .from('cms_class_teachers')
      .select('class_group_id')
      .eq('membership_id', session.membershipId);
    const assignedIds = (assignments ?? []).map((a: Row) => a.class_group_id as string);

    if (assignedIds.length > 0) {
      const { data } = await supabase
        .from('cms_class_groups')
        .select('*')
        .in('id', assignedIds)
        .eq('school_id', session.schoolId)
        .order('name', { ascending: true });
      return (data ?? []).map((row: Row) => ({ classGroup: mapClassGroup(row), assigned: true }));
    }

    if (session.role === 'school_admin') {
      const { data } = await supabase
        .from('cms_class_groups')
        .select('*')
        .eq('school_id', session.schoolId)
        .order('name', { ascending: true });
      return (data ?? []).map((row: Row) => ({ classGroup: mapClassGroup(row), assigned: false }));
    }

    return [];
  } catch (error) {
    safeErrorLog('cms/db/loadTeacherRooms', error);
    return [];
  }
}

/**
 * Turn a REQUESTED room id into a room this session provably owns.
 *
 * Blank/absent → their first room, which is what a single-room teacher always
 * wants. Anything they do not teach → null, and the caller returns 403. This is
 * the Jul-3 cross-tenant lesson written as a function: existence ≠ ownership.
 */
export async function resolveTeacherRoom(
  session: CmsSession,
  requestedClassGroupId: string | null | undefined
): Promise<TeacherRoom | null> {
  const rooms = await loadTeacherRooms(session);
  if (rooms.length === 0) return null;
  const wanted = String(requestedClassGroupId ?? '').trim();
  if (!wanted) return rooms[0];
  return rooms.find((r) => String(r.classGroup.id) === wanted) ?? null;
}

/**
 * Which of these children a FAMILY ACCOUNT owns.
 *
 * 🚨 Ownership is an active PARENT MEMBERSHIP behind one of the child's
 * guardians — not merely "has a guardian row". A teacher's own typed-in
 * emergency contacts are guardian rows with nobody logged in behind them, and
 * counting those would lock the teacher out of the record they are still
 * filling in. Mirrors `cms_staff_entered_child_ids()` in migration 331.
 */
export async function loadChildOwnership(childIds: string[]): Promise<Set<string>> {
  const owned = new Set<string>();
  if (childIds.length === 0) return owned;
  try {
    const supabase = db();
    const { data: links } = await supabase
      .from('cms_child_guardians')
      .select('child_id, guardian_id')
      .in('child_id', childIds);
    const rows: Row[] = links ?? [];
    const guardianIds = Array.from(new Set(rows.map((l) => l.guardian_id as string)));
    if (guardianIds.length === 0) return owned;

    const { data: memberships } = await supabase
      .from('cms_memberships')
      .select('guardian_id')
      .in('guardian_id', guardianIds)
      .eq('role', 'parent')
      .eq('is_active', true);
    const parentGuardians = new Set(
      (memberships ?? []).map((m: Row) => m.guardian_id as string)
    );
    for (const link of rows) {
      if (parentGuardians.has(link.guardian_id)) owned.add(String(link.child_id));
    }
    return owned;
  } catch (error) {
    safeErrorLog('cms/db/loadChildOwnership', error);
    // Fail CLOSED: on an unreadable ownership query every child is treated as
    // family-owned, so the worst case is a teacher who cannot edit — never a
    // teacher who overwrites a parent's record.
    return new Set(childIds.map(String));
  }
}

export interface RosterData {
  school: School;
  room: TeacherRoom;
  children: Child[];
  allergies: Allergy[];
  dietary: DietaryRequirement[];
  medical: MedicalRecord[];
  /** Child ids a family account owns — read-only for the teacher. */
  familyOwned: Set<string>;
}

/** The roster page's whole read, for ONE room. */
export async function loadRoster(
  session: CmsSession,
  room: TeacherRoom
): Promise<RosterData | null> {
  if (!session.schoolId) return null;
  try {
    const supabase = db();
    const [schoolRes, childRes] = await Promise.all([
      supabase.from('cms_schools').select('*').eq('id', session.schoolId).maybeSingle(),
      supabase
        .from('cms_children')
        .select('*')
        .eq('class_group_id', String(room.classGroup.id))
        .is('deleted_at', null)
        .order('preferred_name', { ascending: true }),
    ]);
    if (!schoolRes.data) return null;

    const childRows: Row[] = childRes.data ?? [];
    const bundle = await hydrateChildren(childRows);
    const familyOwned = await loadChildOwnership(childRows.map((c) => String(c.id)));

    return { school: mapSchool(schoolRes.data), room, ...bundle, familyOwned };
  } catch (error) {
    safeErrorLog('cms/db/loadRoster', error);
    return null;
  }
}

// ── writes ──────────────────────────────────────────────────────────────────

type RosterChildInput = ReturnType<typeof normaliseRosterChild>;
type RosterImportInput = ReturnType<typeof normaliseRosterImport>;

export interface RosterWriteResult {
  ok: boolean;
  error?: string;
  childId?: string;
  /** Import only. */
  created?: number;
  skipped?: { name: string; reason: 'already_in_room' }[];
}

/**
 * The sentinel a staff-entered child carries when nobody knows the birthday
 * yet. `cms_children.date_of_birth` is NOT NULL (329), and the alternative —
 * defaulting to today — would print "0 years old" on a class list as if it were
 * a fact. Every read path treats this exact value as "unknown".
 */
export const UNKNOWN_DOB = '1900-01-01';

/** Is this child's date of birth a real one, or the unknown sentinel? */
export function hasKnownDob(dateOfBirth: string | null | undefined): boolean {
  return Boolean(dateOfBirth) && dateOfBirth !== UNKNOWN_DOB;
}

/** The de-duplication key an import matches on: room + folded name + dob. */
function importKey(name: string, dateOfBirth: string | null): string {
  return `${name.trim().toLocaleLowerCase()}|${dateOfBirth ?? ''}`;
}

/**
 * Create many children in one room, idempotently.
 *
 * 🚨 RE-PASTING THE SAME LIST MUST NOT CREATE TWINS. A teacher will paste,
 * notice a typo, fix the spreadsheet and paste the whole thing again — that is
 * normal behaviour, not misuse. Existing rows are matched on
 * (room, lower(preferred_name), date_of_birth) and SKIPPED, and the skipped
 * names are reported so the teacher can see the import did what they meant.
 *
 * A child already in the room WITHOUT a date of birth also matches a pasted
 * line that now carries one — same name, same room, no date on file is the
 * same child gaining a birthday, not a second Amara.
 */
export async function importRosterChildren(
  session: CmsSession,
  room: TeacherRoom,
  rows: RosterImportInput
): Promise<RosterWriteResult> {
  if (!session.schoolId) return { ok: false, error: 'no_school' };
  if (rows.length === 0) return { ok: false, error: 'nothing_to_import' };
  try {
    const supabase = db();
    const classGroupId = String(room.classGroup.id);

    const { data: existingRows } = await supabase
      .from('cms_children')
      .select('preferred_name, date_of_birth')
      .eq('class_group_id', classGroupId)
      .is('deleted_at', null);

    const existing = new Set<string>();
    const namesOnly = new Set<string>();
    for (const row of (existingRows ?? []) as Row[]) {
      existing.add(importKey(String(row.preferred_name ?? ''), row.date_of_birth ?? null));
      namesOnly.add(String(row.preferred_name ?? '').trim().toLocaleLowerCase());
    }

    const skipped: { name: string; reason: 'already_in_room' }[] = [];
    const toInsert: Row[] = [];
    // Within-paste duplicates are caught here too — the browser preview flags
    // them, but a direct POST must not be able to bypass that.
    const seen = new Set<string>();

    for (const row of rows) {
      const key = importKey(row.preferredName, row.dateOfBirth);
      const folded = row.preferredName.trim().toLocaleLowerCase();
      if (existing.has(key) || namesOnly.has(folded) || seen.has(key) || seen.has(folded)) {
        skipped.push({ name: row.preferredName, reason: 'already_in_room' });
        continue;
      }
      seen.add(key);
      seen.add(folded);
      toInsert.push({
        school_id: session.schoolId,
        class_group_id: classGroupId,
        legal_name: row.legalName,
        preferred_name: row.preferredName,
        // `date_of_birth` is NOT NULL in migration 329 (a family application
        // always has one). A staff-entered child may not, so an unknown date
        // is parked on a sentinel the documents render as "—" rather than
        // inventing today's date, which would print a plausible wrong age.
        date_of_birth: row.dateOfBirth ?? UNKNOWN_DOB,
        home_language: 'en',
        created_by_user_id: session.userId,
      });
    }

    let created = 0;
    if (toInsert.length > 0) {
      // 🚨 THE RACE THE READ-THEN-INSERT ABOVE CANNOT CLOSE ON ITS OWN. Two
      // concurrent imports (a retried request racing the original, a second
      // tab) can both pass the `existing`/`namesOnly` check before either
      // commits. `ON CONFLICT ... DO NOTHING` against
      // `idx_cms_children_room_name_dob` (migration 331) is the actual
      // idempotency guarantee — the check above is what makes a normal,
      // sequential re-paste report nice skip reasons; this is what makes it
      // TRUE under a race. A losing row comes back out of `.select()` simply
      // absent, never a 500.
      const { data: insertedRows, error } = await supabase
        .from('cms_children')
        .upsert(toInsert, {
          onConflict: 'class_group_id,preferred_name,date_of_birth',
          ignoreDuplicates: true,
        })
        .select('preferred_name, date_of_birth');
      if (error) throw error;

      const actuallyInserted = new Set(
        (insertedRows ?? []).map((r: Row) =>
          importKey(String(r.preferred_name ?? ''), r.date_of_birth ?? null)
        )
      );
      created = actuallyInserted.size;
      for (const row of toInsert) {
        const key = importKey(String(row.preferred_name), (row.date_of_birth as string) ?? null);
        if (!actuallyInserted.has(key)) {
          skipped.push({ name: String(row.preferred_name), reason: 'already_in_room' });
        }
      }
    }

    return { ok: true, created, skipped };
  } catch (error) {
    safeErrorLog('cms/db/importRosterChildren', error);
    return { ok: false, error: 'write_failed' };
  }
}

/** One child, added by hand. Same idempotency rule as the import. */
export async function createRosterChild(
  session: CmsSession,
  room: TeacherRoom,
  input: RosterChildInput
): Promise<RosterWriteResult> {
  const seed = await importRosterChildren(session, room, [
    {
      preferredName: input.preferredName,
      legalName: input.legalName,
      dateOfBirth: input.dateOfBirth,
    },
  ]);
  if (!seed.ok) return seed;
  if ((seed.created ?? 0) === 0) return { ok: false, error: 'already_in_room' };

  try {
    const supabase = db();
    const { data } = await supabase
      .from('cms_children')
      .select('id')
      .eq('class_group_id', String(room.classGroup.id))
      .eq('preferred_name', input.preferredName)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1);
    const childId = (data ?? [])[0]?.id as string | undefined;
    if (!childId) return { ok: true, created: 1 };
    // The rest of the form (language, note, allergies, diet, contacts) rides in
    // through the ordinary update path, so there is exactly one place that
    // knows how a roster child's lists are written.
    const update = await updateRosterChild(session, room, childId, input);
    return update.ok ? { ok: true, created: 1, childId } : update;
  } catch (error) {
    safeErrorLog('cms/db/createRosterChild', error);
    return { ok: false, error: 'write_failed' };
  }
}

/**
 * The quick-edit save. REPLACE semantics on all three lists.
 *
 * Refuses outright if the child is not in this room, or if a family account
 * owns the record. Both checks are re-done here rather than trusted from the
 * page: the page renders the button, this decides.
 */
export async function updateRosterChild(
  session: CmsSession,
  room: TeacherRoom,
  childId: string,
  input: RosterChildInput
): Promise<RosterWriteResult> {
  if (!session.schoolId) return { ok: false, error: 'no_school' };
  try {
    const supabase = db();
    const classGroupId = String(room.classGroup.id);

    const { data: child } = await supabase
      .from('cms_children')
      .select('id, school_id, class_group_id')
      .eq('id', childId)
      .is('deleted_at', null)
      .maybeSingle();
    if (!child) return { ok: false, error: 'not_found' };
    if (child.class_group_id !== classGroupId || child.school_id !== session.schoolId) {
      return { ok: false, error: 'forbidden' };
    }

    // The authority rule. A school_admin keeps the phase-2 authority over every
    // child in their school; a TEACHER's write window closes the moment a
    // family account claims the record.
    if (session.role === 'teacher') {
      const owned = await loadChildOwnership([childId]);
      if (owned.has(childId)) return { ok: false, error: 'family_owned' };
    }

    const { error: childError } = await supabase
      .from('cms_children')
      .update({
        preferred_name: input.preferredName,
        legal_name: input.legalName,
        date_of_birth: input.dateOfBirth ?? UNKNOWN_DOB,
        home_language: input.homeLanguage,
        staff_note: input.staffNote,
      })
      .eq('id', childId);
    if (childError) throw childError;

    // ── allergies: replace ──────────────────────────────────────────────
    const { error: clearAllergies } = await supabase
      .from('cms_allergies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('child_id', childId)
      .is('deleted_at', null);
    if (clearAllergies) throw clearAllergies;
    if (input.allergies.length > 0) {
      const { error } = await supabase.from('cms_allergies').insert(
        input.allergies.map((row) => ({
          child_id: childId,
          school_id: session.schoolId,
          allergen: row.allergen,
          severity: row.severity,
          reaction: row.reaction,
          response_plan: row.responsePlan,
          carries_epipen: row.carriesEpipen,
          requires_poster: row.requiresPoster,
        }))
      );
      if (error) throw error;
    }

    // ── dietary: replace ────────────────────────────────────────────────
    const { error: clearDietary } = await supabase
      .from('cms_dietary_requirements')
      .update({ deleted_at: new Date().toISOString() })
      .eq('child_id', childId)
      .is('deleted_at', null);
    if (clearDietary) throw clearDietary;
    if (input.dietary.length > 0) {
      const { error } = await supabase.from('cms_dietary_requirements').insert(
        input.dietary.map((row) => ({
          child_id: childId,
          school_id: session.schoolId,
          label: row.label,
          reason: row.reason,
          excluded_foods: row.excludedFoods,
          notes: row.notes,
        }))
      );
      if (error) throw error;
    }

    // ── contacts: replace ───────────────────────────────────────────────
    // Guardian rows attached to a PARENT MEMBERSHIP are never touched: they
    // are somebody's login, and the ownership check above means we only ever
    // get here when there are none. The filter is belt-and-braces for the
    // school_admin path, which legitimately edits claimed records.
    const { data: links } = await supabase
      .from('cms_child_guardians')
      .select('guardian_id')
      .eq('child_id', childId);
    const linkedIds = (links ?? []).map((l: Row) => l.guardian_id as string);
    const protectedIds = new Set<string>();
    if (linkedIds.length > 0) {
      const { data: parentMemberships } = await supabase
        .from('cms_memberships')
        .select('guardian_id')
        .in('guardian_id', linkedIds)
        .eq('role', 'parent');
      for (const m of (parentMemberships ?? []) as Row[]) {
        protectedIds.add(String(m.guardian_id));
      }
    }
    const replaceable = linkedIds.filter((id) => !protectedIds.has(id));

    if (replaceable.length > 0) {
      await supabase
        .from('cms_child_guardians')
        .delete()
        .eq('child_id', childId)
        .in('guardian_id', replaceable);
      await supabase
        .from('cms_pickup_authorizations')
        .delete()
        .eq('child_id', childId)
        .in('guardian_id', replaceable);
      await supabase
        .from('cms_guardians')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', replaceable)
        .eq('school_id', session.schoolId);
    }

    for (const contact of input.contacts) {
      const { data: created, error } = await supabase
        .from('cms_guardians')
        .insert({
          school_id: session.schoolId,
          full_name: contact.fullName,
          relationship: contact.relationship,
          phone: contact.phone,
          email: contact.email,
          can_collect: contact.canCollect,
          contact_priority: contact.contactPriority,
        })
        .select('id')
        .single();
      if (error) throw error;

      const { error: linkError } = await supabase.from('cms_child_guardians').insert({
        child_id: childId,
        guardian_id: created.id,
        is_primary: contact.contactPriority === 1,
        can_collect: contact.canCollect,
      });
      if (linkError) throw linkError;

      if (contact.canCollect) {
        const { error: pickupError } = await supabase.from('cms_pickup_authorizations').insert({
          child_id: childId,
          school_id: session.schoolId,
          guardian_id: created.id,
          authorised: true,
          note: contact.note,
        });
        if (pickupError) throw pickupError;
      }
    }

    return { ok: true, childId };
  } catch (error) {
    safeErrorLog('cms/db/updateRosterChild', error);
    return { ok: false, error: 'write_failed' };
  }
}

// ============================================================================
// PHASE 7 — THE OFFICE. Reading applications, and the decision.
// ============================================================================
// The first surface in CMS that belongs to a `school_admin` and to nobody else.
// Everything here is scoped by `session.schoolId`; an enrolment id in a URL is a
// REQUEST, never a fact, and every read below re-proves the row is this
// school's before it returns a single field of it (the Jul-3 rule).
//
// The office reads the family's application READ-ONLY. There is deliberately no
// "edit their answers" path: the application is what the family said, and an
// office that can quietly rewrite it is no longer evidence of anything.

/** One row on the office list. */
export interface OfficeEnrollmentSummary {
  enrollmentId: string;
  childId: string;
  legalName: string;
  preferredName: string;
  dateOfBirth: string;
  status: string;
  submittedAt: string | null;
  decidedAt: string | null;
  requestedStartDate: string | null;
  requestedRoomId: string | null;
  requestedRoomName: string | null;
  /** Is the requested room linked to a Montree classroom? */
  requestedRoomLinked: boolean;
  completedSteps: string[];
  guardianNames: string[];
  /** 330's seam — set means the handshake has run. */
  montreeChildId: string | null;
  /** 332's cache of the minted code. Null + a link = invite pending. */
  inviteCode: string | null;
}

/** Everything the detail page shows. The application, as the family wrote it. */
export interface OfficeEnrollmentDetail extends OfficeEnrollmentSummary {
  homeLanguage: string;
  settlingNotes: string | null;
  guardians: Guardian[];
  authorisedCollectorIds: string[];
  allergies: Allergy[];
  dietary: DietaryRequirement[];
  medical: MedicalRecord | null;
  profile: ChildProfileSummary | null;
  previousSchools: { name: string; from: string | null; to: string | null; reason: string | null }[];
  consents: { kind: string; granted: boolean }[];
  /** The office's own note on a decline. Read out of `draft_data`. */
  decisionNote: string | null;
}

/** Whether this school (and how many of its rooms) can activate comms at all. */
export interface SchoolLinkStatus {
  montreeSchoolId: string | null;
  roomsTotal: number;
  roomsLinked: number;
}

/**
 * 🚨 THE DECLINE NOTE LIVES IN `draft_data.office_decision`, NOT IN
 * `settling_notes` — and this is the cleaner of the two, not the lazier.
 * `settling_notes` is the FAMILY'S free text ("she naps at one, please do not
 * wake her"); it is written by the wizard, read by the teacher, and printed.
 * Putting an office rejection in it would overwrite what a parent wrote and
 * then show it back to them as their own words. `draft_data` is already the
 * enrolment's untyped side-car by 329's own definition, the office key is
 * namespaced, and nothing else reads it.
 */
const DECISION_KEY = 'office_decision';

interface DecisionBlob {
  note?: string;
  decidedBy?: string;
  at?: string;
}

function readDecision(draftData: unknown): DecisionBlob | null {
  if (!draftData || typeof draftData !== 'object') return null;
  const blob = (draftData as Record<string, unknown>)[DECISION_KEY];
  return blob && typeof blob === 'object' ? (blob as DecisionBlob) : null;
}

/** Which Montree school/rooms this CMS school is linked to. Fail-soft: a
 *  database without migration 332 reports "not linked", which is the truth. */
export async function loadSchoolLinkStatus(schoolId: string): Promise<SchoolLinkStatus> {
  const empty: SchoolLinkStatus = { montreeSchoolId: null, roomsTotal: 0, roomsLinked: 0 };
  try {
    const supabase = db();
    const [schoolRes, roomRes] = await Promise.all([
      supabase.from('cms_schools').select('montree_school_id').eq('id', schoolId).maybeSingle(),
      supabase.from('cms_class_groups').select('id, montree_classroom_id').eq('school_id', schoolId),
    ]);
    const rooms: Row[] = roomRes.data ?? [];
    return {
      montreeSchoolId: schoolRes.data?.montree_school_id ?? null,
      roomsTotal: rooms.length,
      roomsLinked: rooms.filter((r) => r.montree_classroom_id).length,
    };
  } catch (error) {
    safeErrorLog('cms/db/loadSchoolLinkStatus', error);
    return empty;
  }
}

/**
 * The office list. Submitted applications first (they are the work), then the
 * decided ones for reference — an office needs to find last week's acceptance
 * to read a family their code back.
 */
export async function loadOfficeEnrollments(
  session: CmsSession
): Promise<OfficeEnrollmentSummary[]> {
  if (!session.schoolId) return [];
  try {
    const supabase = db();
    const { data: rows } = await supabase
      .from('cms_enrollments')
      .select('*')
      .eq('school_id', session.schoolId)
      .neq('status', 'draft')
      .order('submitted_at', { ascending: false })
      .limit(200);

    const enrollments: Row[] = rows ?? [];
    if (enrollments.length === 0) return [];

    const childIds = enrollments.map((e) => String(e.child_id));
    const [childRes, roomRes, linkRes] = await Promise.all([
      supabase.from('cms_children').select('*').in('id', childIds),
      supabase
        .from('cms_class_groups')
        .select('id, name, montree_classroom_id')
        .eq('school_id', session.schoolId),
      supabase
        .from('cms_child_guardians')
        .select('child_id, guardian_id, is_primary')
        .in('child_id', childIds),
    ]);

    const children = new Map<string, Row>(
      ((childRes.data ?? []) as Row[]).map((c) => [String(c.id), c])
    );
    const rooms = new Map<string, Row>(
      ((roomRes.data ?? []) as Row[]).map((r) => [String(r.id), r])
    );

    const links: Row[] = linkRes.data ?? [];
    const guardianIds = [...new Set(links.map((l) => String(l.guardian_id)))];
    const guardianNames = new Map<string, string>();
    if (guardianIds.length > 0) {
      const { data: guardians } = await supabase
        .from('cms_guardians')
        .select('id, full_name')
        .in('id', guardianIds);
      for (const g of (guardians ?? []) as Row[]) {
        guardianNames.set(String(g.id), String(g.full_name ?? ''));
      }
    }
    const namesByChild = new Map<string, string[]>();
    for (const link of links) {
      const list = namesByChild.get(String(link.child_id)) ?? [];
      const name = guardianNames.get(String(link.guardian_id));
      // The primary guardian leads — the office rings them first, so they read
      // first.
      if (name) {
        if (link.is_primary) list.unshift(name);
        else list.push(name);
      }
      namesByChild.set(String(link.child_id), list);
    }

    const out: OfficeEnrollmentSummary[] = [];
    for (const row of enrollments) {
      const child = children.get(String(row.child_id));
      if (!child) continue;
      const room = row.requested_class_group_id
        ? rooms.get(String(row.requested_class_group_id))
        : undefined;
      out.push({
        enrollmentId: String(row.id),
        childId: String(row.child_id),
        legalName: String(child.legal_name ?? ''),
        preferredName: String(child.preferred_name ?? ''),
        dateOfBirth: String(child.date_of_birth ?? ''),
        status: String(row.status ?? ''),
        submittedAt: row.submitted_at ?? null,
        decidedAt: row.decided_at ?? null,
        requestedStartDate: row.requested_start_date ?? null,
        requestedRoomId: row.requested_class_group_id ?? null,
        requestedRoomName: room ? String(room.name) : null,
        requestedRoomLinked: Boolean(room?.montree_classroom_id),
        completedSteps: Array.isArray(row.completed_steps) ? row.completed_steps : [],
        guardianNames: namesByChild.get(String(row.child_id)) ?? [],
        montreeChildId: child.montree_child_id ?? null,
        inviteCode: child.montree_parent_invite_code ?? null,
      });
    }

    // Submitted first — the queue is the job. Then most recent decision.
    const rank = (s: string) => (s === 'submitted' ? 0 : s === 'in_review' ? 1 : 2);
    out.sort((a, b) => rank(a.status) - rank(b.status));
    return out;
  } catch (error) {
    safeErrorLog('cms/db/loadOfficeEnrollments', error);
    return [];
  }
}

/** One application, in full. Null when it is not this school's. */
export async function loadOfficeEnrollment(
  session: CmsSession,
  enrollmentId: string
): Promise<OfficeEnrollmentDetail | null> {
  if (!session.schoolId) return null;
  try {
    const supabase = db();
    const { data: row } = await supabase
      .from('cms_enrollments')
      .select('*')
      // 🚨 BOTH clauses. `id` alone would happily return another school's
      // application to an office that guessed a uuid.
      .eq('id', enrollmentId)
      .eq('school_id', session.schoolId)
      .maybeSingle();
    if (!row) return null;

    const childId = String(row.child_id);
    const { data: childRow } = await supabase
      .from('cms_children')
      .select('*')
      .eq('id', childId)
      .maybeSingle();
    if (!childRow) return null;

    const [bundle, profiles, roomRes, prevRes, consentRes] = await Promise.all([
      hydrateChildren([childRow]),
      loadChildProfiles([childId]),
      row.requested_class_group_id
        ? supabase
            .from('cms_class_groups')
            .select('id, name, montree_classroom_id')
            .eq('id', String(row.requested_class_group_id))
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('cms_previous_schools')
        .select('school_name, attended_from, attended_to, reason_for_leaving')
        .eq('child_id', childId)
        .is('deleted_at', null),
      supabase.from('cms_consents').select('kind, granted').eq('child_id', childId),
    ]);

    const child = bundle.children[0];
    if (!child) return null;
    const room = roomRes?.data as Row | null;

    const guardianNames = child.guardians.map((g) => g.fullName);
    const decision = readDecision(row.draft_data);

    return {
      enrollmentId: String(row.id),
      childId,
      legalName: child.legalName,
      preferredName: child.preferredName,
      dateOfBirth: child.dateOfBirth,
      homeLanguage: child.homeLanguage,
      status: String(row.status ?? ''),
      submittedAt: row.submitted_at ?? null,
      decidedAt: row.decided_at ?? null,
      requestedStartDate: row.requested_start_date ?? null,
      requestedRoomId: row.requested_class_group_id ?? null,
      requestedRoomName: room ? String(room.name) : null,
      requestedRoomLinked: Boolean(room?.montree_classroom_id),
      completedSteps: Array.isArray(row.completed_steps) ? row.completed_steps : [],
      guardianNames,
      montreeChildId: childRow.montree_child_id ?? null,
      inviteCode: childRow.montree_parent_invite_code ?? null,
      settlingNotes: row.settling_notes ?? null,
      guardians: child.guardians,
      authorisedCollectorIds: child.authorisedCollectors.map((g) => String(g)),
      allergies: bundle.allergies,
      dietary: bundle.dietary,
      medical: bundle.medical[0] ?? null,
      profile: profiles.get(childId) ?? null,
      previousSchools: ((prevRes?.data ?? []) as Row[]).map((p) => ({
        name: String(p.school_name ?? ''),
        from: p.attended_from ?? null,
        to: p.attended_to ?? null,
        reason: p.reason_for_leaving ?? null,
      })),
      consents: ((consentRes?.data ?? []) as Row[]).map((c) => ({
        kind: String(c.kind ?? ''),
        granted: Boolean(c.granted),
      })),
      decisionNote: decision?.note ?? null,
    };
  } catch (error) {
    safeErrorLog('cms/db/loadOfficeEnrollment', error);
    return null;
  }
}

// ── the decision ────────────────────────────────────────────────────────────

/** What the accept route needs before it may touch Montree at all. */
export interface AcceptContext {
  enrollmentId: string;
  childId: string;
  status: string;
  legalName: string;
  preferredName: string;
  /** Null when the roster sentinel says nobody knows the birthday. */
  dateOfBirth: string | null;
  requestedStartDate: string | null;
  montreeSchoolId: string | null;
  montreeClassroomId: string | null;
  montreeChildId: string | null;
  inviteCode: string | null;
}

/**
 * Load exactly the fields the acceptance turns on, re-proving tenancy. Returns
 * null when the enrolment is not this school's — indistinguishable, on purpose,
 * from "does not exist".
 */
export async function loadAcceptContext(
  session: CmsSession,
  enrollmentId: string
): Promise<AcceptContext | null> {
  if (!session.schoolId) return null;
  try {
    const supabase = db();
    const { data: row } = await supabase
      .from('cms_enrollments')
      .select('id, child_id, school_id, status, requested_class_group_id, requested_start_date')
      .eq('id', enrollmentId)
      .eq('school_id', session.schoolId)
      .maybeSingle();
    if (!row) return null;

    const [childRes, schoolRes, roomRes] = await Promise.all([
      supabase
        .from('cms_children')
        .select('id, legal_name, preferred_name, date_of_birth, montree_child_id, montree_parent_invite_code, school_id')
        .eq('id', String(row.child_id))
        .maybeSingle(),
      supabase.from('cms_schools').select('montree_school_id').eq('id', session.schoolId).maybeSingle(),
      row.requested_class_group_id
        ? supabase
            .from('cms_class_groups')
            .select('id, school_id, montree_classroom_id')
            .eq('id', String(row.requested_class_group_id))
            .eq('school_id', session.schoolId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const child = childRes.data as Row | null;
    if (!child) return null;
    const room = roomRes?.data as Row | null;
    const dob = child.date_of_birth ? String(child.date_of_birth) : null;

    return {
      enrollmentId: String(row.id),
      childId: String(child.id),
      status: String(row.status ?? ''),
      legalName: String(child.legal_name ?? ''),
      preferredName: String(child.preferred_name ?? ''),
      dateOfBirth: hasKnownDob(dob) ? dob : null,
      requestedStartDate: row.requested_start_date ?? null,
      montreeSchoolId: schoolRes.data?.montree_school_id ?? null,
      // A room the office never requested cannot be linked, so this stays null
      // and the acceptance lands in the "not linked" branch rather than
      // inventing a classroom.
      montreeClassroomId: room?.montree_classroom_id ?? null,
      montreeChildId: child.montree_child_id ?? null,
      inviteCode: child.montree_parent_invite_code ?? null,
    };
  } catch (error) {
    safeErrorLog('cms/db/loadAcceptContext', error);
    return null;
  }
}

/**
 * Save the Montree link onto the CMS child.
 *
 * 🚨 CALLED BEFORE THE INVITE IS KNOWN TO HAVE WORKED, on purpose. The Montree
 * child exists the moment its insert commits; if we only stored the link on the
 * fully-happy path, an invite failure would leave an orphan child in Montree
 * and the retry would create a second one. Storing the link first makes the
 * retry a mint, not a duplication.
 */
export async function saveMontreeLink(
  childId: string,
  schoolId: string,
  montreeChildId: string,
  inviteCode: string | null,
  options: { stampLinkedAt?: boolean } = {}
): Promise<boolean> {
  try {
    const patch: Record<string, unknown> = { montree_child_id: montreeChildId };
    // Never blank an existing code with a null: a failed re-mint must not erase
    // the code the family is already holding.
    if (inviteCode) patch.montree_parent_invite_code = inviteCode;
    // 332's audit stamp. Written ONCE, by the acceptance that actually created
    // the Montree child — a retry that only mints the invite must not move it,
    // or "when did this family get routed?" quietly becomes "when did someone
    // last press the button?".
    if (options.stampLinkedAt) patch.montree_linked_at = new Date().toISOString();
    const { error } = await db()
      .from('cms_children')
      .update(patch)
      .eq('id', childId)
      .eq('school_id', schoolId);
    if (error) throw error;
    return true;
  } catch (error) {
    safeErrorLog('cms/db/saveMontreeLink', error);
    return false;
  }
}

/**
 * Put the family's copy of the code on the PRIMARY guardian's own row
 * (332's `cms_guardians.montree_parent_invite_code`).
 *
 * Why a second home for one string: the doorway at /cms/parent/messages reads
 * the signed-in guardian's row, which is the row that person's session already
 * owns; the office reads the child's. `cms_children` stays authoritative — one
 * code per CHILD is Montree's model, and a guardian with two children cannot
 * hold both in one text column, so this holds the most recent and the doorway
 * still lists per-child codes.
 *
 * NON-FATAL by design: the link and the child's own code are already saved by
 * the time this runs. A failure here costs a fallback lookup, never an
 * acceptance.
 */
export async function savePrimaryGuardianInviteCode(
  childId: string,
  schoolId: string,
  inviteCode: string
): Promise<boolean> {
  try {
    const supabase = db();
    const { data: links } = await supabase
      .from('cms_child_guardians')
      .select('guardian_id, is_primary')
      .eq('child_id', childId);
    const rows = (links ?? []) as Row[];
    // The primary guardian, or — when nobody was marked primary, which the
    // wizard permits — the only one there is. With several unmarked guardians
    // we write to none: guessing which parent "the" code belongs to is worse
    // than leaving the doorway to fall back to the child's copy.
    const chosen =
      rows.find((r) => r.is_primary === true)?.guardian_id ??
      (rows.length === 1 ? rows[0].guardian_id : null);
    if (!chosen) return false;

    const { error } = await supabase
      .from('cms_guardians')
      .update({ montree_parent_invite_code: inviteCode })
      .eq('id', String(chosen))
      .eq('school_id', schoolId);
    if (error) throw error;
    return true;
  } catch (error) {
    safeErrorLog('cms/db/savePrimaryGuardianInviteCode', error);
    return false;
  }
}

/**
 * Move an enrolment to its decided state and record WHO decided.
 *
 * Both writes are re-scoped to the session's school. `decided_by_user_id` is
 * 332's column: "accepted at 14:02" with no name is not an audit trail for an
 * act that creates a child in another product and mints a family a credential.
 */
export async function recordDecision(
  session: CmsSession,
  enrollmentId: string,
  // `waitlisted` is a decision too — the office looked at the application and
  // said "not now, but not no". Recording WHO held it is the same audit need,
  // and it is reversible: a waitlisted enrolment can still be accepted, so
  // nothing about it touches Montree.
  status: 'accepted' | 'declined' | 'waitlisted',
  note: string | null,
  currentDraftData: Record<string, unknown> | null
): Promise<boolean> {
  if (!session.schoolId) return false;
  try {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      status,
      decided_at: now,
      decided_by_user_id: session.userId,
    };
    if (note !== null) {
      patch.draft_data = {
        ...(currentDraftData ?? {}),
        [DECISION_KEY]: { note, decidedBy: session.displayName || session.email, at: now },
      };
    }
    const { error } = await db()
      .from('cms_enrollments')
      .update(patch)
      .eq('id', enrollmentId)
      .eq('school_id', session.schoolId);
    if (error) throw error;
    return true;
  } catch (error) {
    safeErrorLog('cms/db/recordDecision', error);
    return false;
  }
}

/**
 * 🚨 THE FIRST-ACCEPT MUTEX. Two school_admins (or one double-clicking tab and
 * one retried fetch) can both pass the accept route's status check before
 * either has written anything — the enrolment read and the eventual
 * `recordDecision` write used to be two separate round trips with nothing
 * between them, so both requests would call the Montree junction with no
 * `montreeChildId` yet stored and BOTH would create a Montree child.
 *
 * This is a single conditional UPDATE, atomic at the row level: `eq('status',
 * fromStatus)` means only the request that still sees the status it read gets
 * to flip it. A request that loses the race affects zero rows and knows
 * immediately, before it ever asks Montree for anything. The winner's own
 * write is indistinguishable from the old `recordDecision` call it replaces
 * for the fresh-accept path — same columns, same values.
 */
export async function claimEnrollmentForAccept(
  session: CmsSession,
  enrollmentId: string,
  fromStatus: string
): Promise<boolean> {
  if (!session.schoolId) return false;
  try {
    const { data, error } = await db()
      .from('cms_enrollments')
      .update({
        status: 'accepted',
        decided_at: new Date().toISOString(),
        decided_by_user_id: session.userId,
      })
      .eq('id', enrollmentId)
      .eq('school_id', session.schoolId)
      .eq('status', fromStatus)
      .select('id');
    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    safeErrorLog('cms/db/claimEnrollmentForAccept', error);
    return false;
  }
}

/** The current side-car blob, so a decision note merges rather than replaces. */
export async function loadDraftData(
  session: CmsSession,
  enrollmentId: string
): Promise<Record<string, unknown> | null> {
  if (!session.schoolId) return null;
  try {
    const { data } = await db()
      .from('cms_enrollments')
      .select('draft_data')
      .eq('id', enrollmentId)
      .eq('school_id', session.schoolId)
      .maybeSingle();
    return data?.draft_data && typeof data.draft_data === 'object' ? data.draft_data : {};
  } catch (error) {
    safeErrorLog('cms/db/loadDraftData', error);
    return null;
  }
}

// ── the parent doorway (phase 7) ────────────────────────────────────────────

/** What /cms/parent/messages and /updates need: is this family routed yet? */
export interface ParentDoorway {
  childId: string;
  preferredName: string;
  montreeLinked: boolean;
  inviteCode: string | null;
}

/**
 * One row per child this family holds, saying whether their school has switched
 * communication on for them yet. Read through the SESSION's guardian id — a
 * family can never ask about a child that is not theirs.
 */
export async function loadParentDoorways(session: CmsSession): Promise<ParentDoorway[]> {
  if (!session.guardianId) return [];
  try {
    const supabase = db();
    const { data: links } = await supabase
      .from('cms_child_guardians')
      .select('child_id')
      .eq('guardian_id', session.guardianId);
    const childIds = ((links ?? []) as Row[]).map((l) => String(l.child_id));
    if (childIds.length === 0) return [];

    const [childRes, guardianRes] = await Promise.all([
      supabase
        .from('cms_children')
        .select('id, preferred_name, montree_child_id, montree_parent_invite_code')
        .in('id', childIds)
        .is('deleted_at', null)
        .order('preferred_name', { ascending: true }),
      // 332's family-side copy, on the row this session already owns. It is the
      // FALLBACK, not the source: it holds one code and a family can have two
      // children. When the child's own copy is missing (a link repaired by hand,
      // a mid-migration row) this is what keeps the doorway from going blank.
      supabase
        .from('cms_guardians')
        .select('montree_parent_invite_code')
        .eq('id', session.guardianId)
        .maybeSingle(),
    ]);

    const guardianCode = (guardianRes?.data as Row | null)?.montree_parent_invite_code;
    const fallback = typeof guardianCode === 'string' && guardianCode ? guardianCode : null;
    const children = childRes.data;
    const linkedCount = ((children ?? []) as Row[]).filter((c) => c.montree_child_id).length;

    return ((children ?? []) as Row[]).map((c) => ({
      childId: String(c.id),
      preferredName: String(c.preferred_name ?? ''),
      montreeLinked: Boolean(c.montree_child_id),
      inviteCode: c.montree_parent_invite_code
        ? String(c.montree_parent_invite_code)
        : // Only when there is exactly ONE linked child can the guardian's
          // single stored code be attributed to them without guessing.
          c.montree_child_id && linkedCount === 1
          ? fallback
          : null,
    }));
  } catch (error) {
    // Migration 332 not run yet → no doorway, not a 500.
    safeErrorLog('cms/db/loadParentDoorways', error);
    return [];
  }
}
