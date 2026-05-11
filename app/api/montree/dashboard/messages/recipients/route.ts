// /api/montree/dashboard/messages/recipients/route.ts
// Session 103 — recipients bundle for teacher's compose modal.
//
// Returns:
//   - children[]: each child in the teacher's classroom, with the parents
//                 linked to that child. Used for parent_teacher threads.
//   - principal: school's primary principal (most-recently-logged-in active
//                principal, oldest as tiebreaker — matches the ordering used
//                by addPrincipalObserver() in thread-resolver.ts and the
//                parent-side recipients route). Used for `internal` threads.
//   - classroom: the teacher's classroom shorthand for the UI subtitle.
//
// Auth: teacher OR homeschool_parent role only. All queries school-scoped
// via auth.schoolId. Cross-pollination filter is non-negotiable.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

interface ClassroomRow {
  id: string;
  name: string;
  school_id: string;
}

interface ChildRow {
  id: string;
  name: string;
  classroom_id: string | null;
  is_active: boolean;
}

interface ParentRow {
  id: string;
  name: string | null;
  email: string;
}

interface PrincipalRow {
  id: string;
  name: string;
}

interface TeacherRow {
  id: string;
  classroom_id: string | null;
  school_id: string;
}

export interface TeacherRecipientOption {
  role: 'parent' | 'principal';
  id: string;
  name: string;
}

export interface TeacherRecipientChildBundle {
  child_id: string;
  child_name: string;
  parents: TeacherRecipientOption[];
}

export interface TeacherRecipientsResponse {
  classroom: { id: string; name: string } | null;
  children: TeacherRecipientChildBundle[];
  principal: TeacherRecipientOption | null;
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== 'teacher' && auth.role !== 'homeschool_parent') {
    return NextResponse.json(
      { error: 'Only teachers can use this endpoint' },
      { status: 403 }
    );
  }

  const supabase = getSupabase();

  // 1. Resolve the teacher's classroom. JWT classroomId is the primary
  //    source but we defensively fall back to montree_teachers in case the
  //    JWT was issued before a classroom assignment.
  let classroomId: string | null = auth.classroomId || null;
  if (!classroomId) {
    const { data: teacherRow } = await supabase
      .from('montree_teachers')
      .select('id, classroom_id, school_id')
      .eq('id', auth.userId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();
    const teacher = teacherRow as TeacherRow | null;
    classroomId = teacher?.classroom_id || null;
  }

  // 2. Pull classroom details + principal in parallel.
  const [classroomRes, principalRes] = await Promise.all([
    classroomId
      ? supabase
          .from('montree_classrooms')
          .select('id, name, school_id')
          .eq('id', classroomId)
          .eq('school_id', auth.schoolId)
          .maybeSingle()
      : Promise.resolve({ data: null as ClassroomRow | null }),
    supabase
      .from('montree_school_admins')
      .select('id, name')
      .eq('school_id', auth.schoolId)
      .eq('is_active', true)
      .order('last_login', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const classroomRow = (classroomRes.data || null) as ClassroomRow | null;
  const principalRow = (principalRes.data || null) as PrincipalRow | null;

  const principal: TeacherRecipientOption | null = principalRow
    ? { role: 'principal', id: principalRow.id, name: principalRow.name }
    : null;

  // No classroom assigned yet → return empty children + just the principal.
  if (!classroomId || !classroomRow) {
    return NextResponse.json<TeacherRecipientsResponse>({
      classroom: null,
      children: [],
      principal,
    });
  }

  // 3. Pull active children in the classroom.
  const { data: childRows } = await supabase
    .from('montree_children')
    .select('id, name, classroom_id, is_active')
    .eq('classroom_id', classroomId)
    .eq('is_active', true)
    .order('name', { ascending: true });
  const children = (childRows || []) as ChildRow[];

  if (!children.length) {
    return NextResponse.json<TeacherRecipientsResponse>({
      classroom: { id: classroomRow.id, name: classroomRow.name },
      children: [],
      principal,
    });
  }

  const childIds = children.map((c) => c.id);

  // 4. Find parents linked to those children.
  const { data: linkRows } = await supabase
    .from('montree_parent_children')
    .select('parent_id, child_id')
    .in('child_id', childIds);

  const parentIdsSet = new Set<string>();
  const parentChildPairs: Array<{ parent_id: string; child_id: string }> = [];
  for (const link of linkRows || []) {
    parentIdsSet.add(link.parent_id);
    parentChildPairs.push({ parent_id: link.parent_id, child_id: link.child_id });
  }

  // 5. Hydrate parent names. School-scope + is_active filter belt-and-braces.
  const parentIds = Array.from(parentIdsSet);
  const { data: parentRows } = parentIds.length
    ? await supabase
        .from('montree_parents')
        .select('id, name, email')
        .in('id', parentIds)
        .eq('school_id', auth.schoolId)
        .eq('is_active', true)
    : { data: [] as ParentRow[] };

  const parentById = new Map<string, ParentRow>();
  for (const p of (parentRows || []) as ParentRow[]) parentById.set(p.id, p);

  // 6. Build per-child parent lists.
  const parentsByChild = new Map<string, TeacherRecipientOption[]>();
  for (const link of parentChildPairs) {
    const parent = parentById.get(link.parent_id);
    if (!parent) continue;
    const arr = parentsByChild.get(link.child_id) || [];
    arr.push({
      role: 'parent',
      id: parent.id,
      name: parent.name || parent.email,
    });
    parentsByChild.set(link.child_id, arr);
  }
  // Sort each child's parents alphabetically for stable UI.
  for (const arr of parentsByChild.values()) {
    arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  // 7. Build bundles. Children with no linked parents still appear, so the
  //    teacher can see them in the UI and understand why no parent is reachable.
  const childBundles: TeacherRecipientChildBundle[] = children.map((c) => ({
    child_id: c.id,
    child_name: c.name,
    parents: parentsByChild.get(c.id) || [],
  }));

  return NextResponse.json<TeacherRecipientsResponse>({
    classroom: { id: classroomRow.id, name: classroomRow.name },
    children: childBundles,
    principal,
  });
}
