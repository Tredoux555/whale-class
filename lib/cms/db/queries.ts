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
