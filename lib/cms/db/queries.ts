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
