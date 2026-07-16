// lib/montree/onboarding-copilot/state-loader.ts
//
// Shared server-side loader for the Onboarding Copilot. Used by BOTH the
// /state route and the /ask route so they derive identical CopilotState.
//
// 🚨 Contract §3 landmine #5: mirror existing route logic — do NOT invent
//    table shapes. Sources mirrored:
//      - profiles_onboarded  → montree_child_mental_profiles (voice/status route)
//      - reports_sent        → montree_weekly_reports status='sent' (dashboard/parent-codes route)
//      - photos              → montree_media school/classroom scope + teacher_confirmed (photo-audit routes)
//      - parent_codes        → montree_parent_invites (dashboard/parent-codes route)
//
// Every query fails soft — a null/undefined count degrades to 0. The route
// wrappers turn any thrown error into {enabled:false} so the copilot can
// never break a page.

import { isFeatureEnabled } from '@/lib/montree/features/server';
import type { CopilotState, JourneyId } from './journeys';

export type CopilotRole = 'teacher' | 'principal' | 'homeschool_parent' | 'agent';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared helper takes the untyped service-role client
type Supa = any;

/**
 * Map an auth role to a journey. Principals get the principal journey;
 * teachers + homeschool parents get the teacher journey. Anything else
 * (e.g. agent) has no onboarding journey → null (route returns disabled).
 */
export function journeyForRole(role: string | undefined): JourneyId | null {
  if (role === 'principal') return 'principal';
  if (role === 'teacher' || role === 'homeschool_parent') return 'teacher';
  return null;
}

interface LoadArgs {
  schoolId: string;
  classroomId?: string;
  role: CopilotRole;
}

/**
 * Compute the CopilotState for a school (principal: school-scoped) or a
 * classroom (teacher: classroom-scoped). Cheap count/head:true queries where
 * possible; a single light id-select of the scope's children powers the three
 * child-keyed counts (profiles / parent codes / reports).
 */
export async function loadCopilotState(
  supabase: Supa,
  { schoolId, classroomId, role }: LoadArgs
): Promise<CopilotState> {
  const isPrincipal = role === 'principal';

  let classrooms = 0;
  let teachers = 0;
  let teachers_logged_in = 0;
  let classrooms_without_teacher = 0;
  let pending_teacher_names: string[] = [];
  let logged_in_teacher_names: string[] = [];

  // Structural counts only matter to the PRINCIPAL journey (P1–P3). Skip the
  // extra round-trips for the teacher journey entirely.
  if (isPrincipal) {
    const { data: classroomRows } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('school_id', schoolId)
      .eq('is_active', true);
    const classroomIds = ((classroomRows || []) as Array<{ id: string }>).map((c) => c.id);
    classrooms = classroomIds.length;

    const { data: teacherRows } = await supabase
      .from('montree_teachers')
      .select('classroom_id, last_login_at, name')
      .eq('school_id', schoolId)
      .eq('is_active', true);
    const trs = (teacherRows || []) as Array<{
      classroom_id: string | null;
      last_login_at: string | null;
      name: string | null;
    }>;
    teachers = trs.length;
    teachers_logged_in = trs.filter((t) => !!t.last_login_at).length;
    const staffedClassroomIds = new Set(
      trs.map((t) => t.classroom_id).filter((id): id is string => !!id)
    );
    classrooms_without_teacher = classroomIds.filter((id) => !staffedClassroomIds.has(id)).length;
    pending_teacher_names = trs
      .filter((t) => !t.last_login_at)
      .map((t) => t.name)
      .filter((n): n is string => !!n)
      .slice(0, 5);
    logged_in_teacher_names = trs
      .filter((t) => !!t.last_login_at)
      .map((t) => t.name)
      .filter((n): n is string => !!n)
      .slice(0, 5);
  }

  // Children in scope (id-only select — cheap, and reused for the three
  // child-keyed counts below).
  let childQuery = supabase
    .from('montree_children')
    .select('id')
    .eq('is_active', true);
  childQuery = isPrincipal
    ? childQuery.eq('school_id', schoolId)
    : childQuery.eq('classroom_id', classroomId || '__none__');
  const { data: childRows } = await childQuery;
  const childIds = ((childRows || []) as Array<{ id: string }>).map((c) => c.id);
  const students = childIds.length;

  let profiles_onboarded = 0;
  let parent_codes = 0;
  let reports_sent = 0;

  if (childIds.length > 0) {
    const [profilesRes, invitesRes, reportsRes] = await Promise.all([
      supabase
        .from('montree_child_mental_profiles')
        .select('child_id', { count: 'exact', head: true })
        .in('child_id', childIds),
      supabase
        .from('montree_parent_invites')
        .select('id', { count: 'exact', head: true })
        .in('child_id', childIds),
      supabase
        .from('montree_weekly_reports')
        .select('id', { count: 'exact', head: true })
        .in('child_id', childIds)
        .eq('status', 'sent'),
    ]);
    profiles_onboarded = profilesRes.count || 0;
    parent_codes = invitesRes.count || 0;
    reports_sent = reportsRes.count || 0;
  }

  // Photos — montree_media carries both school_id and classroom_id.
  let photoQuery = supabase
    .from('montree_media')
    .select('id', { count: 'exact', head: true });
  let photoConfirmedQuery = supabase
    .from('montree_media')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_confirmed', true);
  if (isPrincipal) {
    photoQuery = photoQuery.eq('school_id', schoolId);
    photoConfirmedQuery = photoConfirmedQuery.eq('school_id', schoolId);
  } else {
    photoQuery = photoQuery.eq('classroom_id', classroomId || '__none__');
    photoConfirmedQuery = photoConfirmedQuery.eq('classroom_id', classroomId || '__none__');
  }
  const [photoRes, photoConfirmedRes] = await Promise.all([photoQuery, photoConfirmedQuery]);
  const photos = photoRes.count || 0;
  const photos_confirmed = photoConfirmedRes.count || 0;

  const tell_guru_enabled = await isFeatureEnabled(supabase, schoolId, 'tell_guru_onboarding');

  return {
    classrooms,
    classrooms_without_teacher,
    teachers,
    teachers_logged_in,
    students,
    profiles_onboarded,
    photos,
    photos_confirmed,
    parent_codes,
    reports_sent,
    tell_guru_enabled,
    pending_teacher_names,
    logged_in_teacher_names,
  };
}

export interface CopilotProgress {
  progress_step_keys: string[];
  dismissed: boolean;
  completed_celebrated: boolean;
}

/**
 * Read the user's copilot progress rows for one journey. user_type = the
 * auth role (values here: teacher | principal | homeschool_parent), matching
 * the write path in the progress route so reads + writes always align.
 */
export async function loadCopilotProgress(
  supabase: Supa,
  { userId, role, journey }: { userId: string; role: CopilotRole; journey: JourneyId }
): Promise<CopilotProgress> {
  const featureModule = `copilot_${journey}`;
  const { data } = await supabase
    .from('montree_onboarding_progress')
    .select('step_key')
    .eq('user_id', userId)
    .eq('user_type', role)
    .eq('feature_module', featureModule);
  const keys = ((data || []) as Array<{ step_key: string }>).map((r) => r.step_key);
  return {
    progress_step_keys: keys,
    dismissed: keys.includes('__dismissed__'),
    completed_celebrated: keys.includes('__completed__'),
  };
}
