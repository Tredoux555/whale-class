// app/api/montree/appointments/parents/route.ts
//
// Returns the child→parents bundle for the staff-initiated appointment
// invitation flow (Session 117 continued).
//
// AUTH: teacher OR principal.
//
// SCOPE:
//   - teacher  → children in their own classroom only
//   - principal → all children in their school (transparency rule mirrors
//                 the school-wide visibility of /api/montree/appointments)
//
// SHAPE (consistent across both roles):
//   {
//     children: [{
//       child_id, child_name, classroom_id, classroom_name,
//       parents: [{ id, name, email }]
//     }],
//     teachers?: [{ id, name }]   // principal-only — for the "also invite"
//                                  // picker in SetAppointmentModal
//   }
//
// CROSS-POLLINATION: every query filtered by school_id. For teacher role
// we additionally filter children by classroom_id.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const enabled = await isFeatureEnabled(supabase, auth.schoolId, 'appointments');
  if (!enabled) {
    return NextResponse.json({ feature_disabled: true, children: [] });
  }

  // ── Resolve scope ──────────────────────────────────────────────────
  // Teacher → their own classroom only. JWT classroomId is the primary
  // source. Defensive fallback to DB lookup in case JWT predates a
  // classroom assignment.
  let allowedClassroomIds: string[] | null = null;
  if (auth.role === 'teacher') {
    let classroomId: string | null = auth.classroomId || null;
    if (!classroomId) {
      const { data: teacherRow } = await supabase
        .from('montree_teachers')
        .select('classroom_id')
        .eq('id', auth.userId)
        .eq('school_id', auth.schoolId)
        .maybeSingle();
      classroomId = (teacherRow as { classroom_id: string | null } | null)?.classroom_id || null;
    }
    if (!classroomId) {
      // Teacher with no classroom — they can't invite anyone.
      return NextResponse.json({ children: [] });
    }
    allowedClassroomIds = [classroomId];
  }

  // ── Pull children + their classrooms ──────────────────────────────
  let childrenQ = supabase
    .from('montree_children')
    .select('id, name, classroom_id, school_id')
    .eq('school_id', auth.schoolId)
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (allowedClassroomIds) {
    childrenQ = childrenQ.in('classroom_id', allowedClassroomIds);
  }
  const { data: childRows, error: childErr } = await childrenQ;
  if (childErr) {
    console.error('[appointments/parents] children error', childErr);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
  type ChildRow = { id: string; name: string; classroom_id: string | null; school_id: string };
  const children = (childRows || []) as ChildRow[];
  if (children.length === 0) {
    return NextResponse.json({ children: [] });
  }

  const childIds = children.map((c) => c.id);

  // ── Pull classroom names + parent links in parallel ───────────────
  const classroomIds = Array.from(
    new Set(children.map((c) => c.classroom_id).filter((id): id is string => Boolean(id)))
  );
  const [classroomsRes, linksRes] = await Promise.all([
    classroomIds.length
      ? supabase
          .from('montree_classrooms')
          .select('id, name')
          .in('id', classroomIds)
          .eq('school_id', auth.schoolId)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    supabase
      .from('montree_parent_children')
      .select('parent_id, child_id')
      .in('child_id', childIds),
  ]);
  const classroomName = new Map<string, string>();
  for (const c of (classroomsRes.data || []) as Array<{ id: string; name: string }>) {
    classroomName.set(c.id, c.name);
  }
  const linksByChild = new Map<string, string[]>();
  for (const l of (linksRes.data || []) as Array<{ parent_id: string; child_id: string }>) {
    const arr = linksByChild.get(l.child_id) || [];
    arr.push(l.parent_id);
    linksByChild.set(l.child_id, arr);
  }

  // ── Hydrate parent rows ───────────────────────────────────────────
  const allParentIds = Array.from(
    new Set(Array.from(linksByChild.values()).flat())
  );
  let parentById = new Map<string, { id: string; name: string; email: string; is_active: boolean }>();
  if (allParentIds.length) {
    const { data: parentRows } = await supabase
      .from('montree_parents')
      .select('id, name, email, is_active')
      .in('id', allParentIds)
      .eq('school_id', auth.schoolId)
      .eq('is_active', true);
    parentById = new Map(
      ((parentRows as Array<{ id: string; name: string | null; email: string; is_active: boolean }> | null) || []).map(
        (p) => [p.id, { id: p.id, name: p.name || p.email, email: p.email, is_active: p.is_active }]
      )
    );
  }

  // ── Build child→parents bundle ────────────────────────────────────
  const childrenOut = children
    .map((c) => {
      const parentIds = linksByChild.get(c.id) || [];
      const parents = parentIds
        .map((pid) => parentById.get(pid))
        .filter((p): p is { id: string; name: string; email: string; is_active: boolean } => !!p)
        .map((p) => ({ id: p.id, name: p.name, email: p.email }));
      return {
        child_id: c.id,
        child_name: c.name,
        classroom_id: c.classroom_id,
        classroom_name: c.classroom_id ? classroomName.get(c.classroom_id) || null : null,
        parents,
      };
    })
    // Hide children with no linked parents — staff can't invite anyone.
    .filter((c) => c.parents.length > 0);

  // ── Principal-only: also return school teacher list for co-host invite
  let teachers: Array<{ id: string; name: string }> | undefined;
  if (auth.role === 'principal') {
    const { data: teacherRows } = await supabase
      .from('montree_teachers')
      .select('id, name, email, is_active')
      .eq('school_id', auth.schoolId)
      .eq('is_active', true)
      .order('name', { ascending: true });
    teachers = ((teacherRows as Array<{ id: string; name: string | null; email: string }> | null) || []).map(
      (t) => ({ id: t.id, name: t.name || t.email })
    );
  }

  return NextResponse.json({
    children: childrenOut,
    ...(teachers ? { teachers } : {}),
  });
}
