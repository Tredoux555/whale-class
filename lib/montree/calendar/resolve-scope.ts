// lib/montree/calendar/resolve-scope.ts
// Calendar Plan §4 — shared scope resolver used by /calendar and
// /calendar/summary routes. Honours the same auth contract.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyParentSession } from '@/lib/montree/verify-parent-request';
import { getSupabase } from '@/lib/supabase-client';
import type { CalendarRole, CalendarScope } from './types';

export interface ResolvedScope {
  scope: CalendarScope;
}

/**
 * Resolves the calendar scope for the current request. Tries staff auth
 * first (teacher / principal / super_admin), then parent. Returns either
 * { scope } on success or a NextResponse error (401/403/404).
 */
export async function resolveCalendarScope(
  request: NextRequest,
): Promise<ResolvedScope | NextResponse> {
  // Staff path.
  const staff = await verifySchoolRequest(request);
  if (!(staff instanceof NextResponse)) {
    const supabase = getSupabase();

    // Session 129 follow-up — defensive principal-upgrade.
    // Founder-principals (someone in BOTH montree_teachers AND
    // montree_school_admins) often get role='teacher' stamped on their JWT
    // by the unified login (same bug class as Session 86 Tracy 403).
    // For the calendar surface that means QuickCreateMenu hides the Term
    // option because ACTIONS_BY_ROLE['teacher'] doesn't include it.
    // Fix: if the JWT role is teacher but this user is ALSO an active
    // principal in this school, upgrade the calendar scope role to
    // 'principal' so the surface presents the full set of principal-level
    // affordances. Read-only routes are unaffected — this only changes the
    // *display* role on the calendar.
    let effectiveRole: CalendarRole = (staff.role as CalendarRole) || 'teacher';
    if (effectiveRole === 'teacher') {
      const { data: adminRow } = await supabase
        .from('montree_school_admins')
        .select('id, role, is_active')
        .eq('id', staff.userId)
        .eq('school_id', staff.schoolId)
        .eq('is_active', true)
        .eq('role', 'principal')
        .maybeSingle();
      if (adminRow) {
        console.warn(
          `[CalendarScope] JWT role='teacher' but user ${staff.userId} is an active principal in school ${staff.schoolId} — upgrading scope role to 'principal'.`,
        );
        effectiveRole = 'principal';
      }
    }

    let childIds: string[] = [];
    if (effectiveRole === 'teacher' && staff.classroomId) {
      const { data } = await supabase
        .from('montree_children')
        .select('id')
        .eq('classroom_id', staff.classroomId)
        .eq('is_active', true);
      childIds = (data || []).map((r: { id: string }) => r.id);
    }
    return {
      scope: {
        role: effectiveRole,
        schoolId: staff.schoolId,
        classroomId: staff.classroomId || null,
        childIds,
      },
    };
  }

  // Parent path.
  const parent = await verifyParentSession();
  if (parent) {
    const supabase = getSupabase();
    let childIds: string[] = [];
    if (parent.parentId) {
      const { data: links } = await supabase
        .from('montree_parent_children')
        .select('child_id')
        .eq('parent_id', parent.parentId);
      childIds = (links || []).map((r: { child_id: string }) => r.child_id);
      if (parent.childId && !childIds.includes(parent.childId)) {
        childIds.push(parent.childId);
      }
    } else if (parent.childId) {
      childIds = [parent.childId];
    }
    if (childIds.length === 0) {
      return NextResponse.json(
        { error: 'No children linked to this parent.' },
        { status: 403 },
      );
    }
    const { data: kid } = await supabase
      .from('montree_children')
      .select('school_id, classroom_id')
      .eq('id', childIds[0])
      .maybeSingle();
    if (!kid) {
      return NextResponse.json({ error: 'Linked child not found.' }, { status: 404 });
    }
    return {
      scope: {
        role: 'parent',
        schoolId: kid.school_id,
        classroomId: kid.classroom_id || null,
        childIds,
      },
    };
  }

  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}
