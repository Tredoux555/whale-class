// /api/montree/admin/communication/directory/route.ts
// Session 97 — directory of teachers + parents in this school. Powers the
// "By Classroom" / "All Teachers" / "All Parents" tabs in the Communication
// hub. Principal-only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal' && auth.role !== 'teacher') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  const supabase = getSupabase();

  // Two-step fetch: classrooms first so we can scope the children query
  // server-side (avoids pulling every child in the DB). Teachers can run
  // in parallel with classrooms.
  const [classroomsRes, teachersRes] = await Promise.all([
    supabase
      .from('montree_classrooms')
      .select('id, name, color, icon')
      .eq('school_id', auth.schoolId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('montree_teachers')
      .select('id, name, email, classroom_id, login_code, role, is_active')
      .eq('school_id', auth.schoolId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ]);

  const classrooms = classroomsRes.data || [];
  const teachers = teachersRes.data || [];
  const classroomIdList = classrooms.map((c) => c.id);

  // Now scope children by the school's classrooms (server-side filter).
  const childrenRes = classroomIdList.length
    ? await supabase
        .from('montree_children')
        .select('id, name, classroom_id, photo_url')
        .eq('is_active', true)
        .in('classroom_id', classroomIdList)
    : { data: [] as Array<{ id: string; name: string; classroom_id: string; photo_url: string | null }> };

  const children = childrenRes.data || [];

  let parentsByClassroom: Map<string, Array<{ id: string; name: string; email: string; child_ids: string[] }>> =
    new Map();

  if (children.length) {
    const childIds = children.map((c) => c.id);
    const { data: links } = await supabase
      .from('montree_parent_children')
      .select('parent_id, child_id')
      .in('child_id', childIds);

    const parentIds = Array.from(new Set((links || []).map((l) => l.parent_id)));
    const { data: parents } = parentIds.length
      ? await supabase
          .from('montree_parents')
          .select('id, name, email')
          .in('id', parentIds)
      : { data: [] as Array<{ id: string; name: string; email: string }> };

    const parentById = new Map((parents || []).map((p) => [p.id, p]));
    const childToClassroom = new Map(children.map((c) => [c.id, c.classroom_id]));
    const childNameById = new Map(children.map((c) => [c.id, c.name]));
    const parentChildren = new Map<string, string[]>();
    const parentClassrooms = new Map<string, Set<string>>();

    for (const link of links || []) {
      if (!parentChildren.has(link.parent_id)) parentChildren.set(link.parent_id, []);
      parentChildren.get(link.parent_id)!.push(link.child_id);

      const cid = childToClassroom.get(link.child_id);
      if (cid) {
        if (!parentClassrooms.has(link.parent_id)) parentClassrooms.set(link.parent_id, new Set());
        parentClassrooms.get(link.parent_id)!.add(cid);
      }
    }

    parentsByClassroom = new Map();
    for (const cid of classrooms.map((c) => c.id)) parentsByClassroom.set(cid, []);
    for (const [pid, cids] of parentClassrooms) {
      const parent = parentById.get(pid);
      if (!parent) continue;
      const childIds = parentChildren.get(pid) || [];
      for (const cid of cids) {
        const arr = parentsByClassroom.get(cid) || [];
        // Session 140: an unclaimed parent invite has name = "pending-<uuid>" (a
        // DB placeholder). Don't surface that raw token in the directory — fall
        // back to the linked child's name ("Eric’s parent"), then email, then a
        // generic label. (Fixes the Communication "By classroom" view showing
        // raw pending- IDs; the Parents page was already handled.)
        const rawName = parent.name;
        const firstChildName = childIds.map((cid2) => childNameById.get(cid2)).find(Boolean);
        const friendlyName =
          rawName && !rawName.startsWith('pending-')
            ? rawName
            : firstChildName
              ? `${firstChildName}’s parent`
              : parent.email || 'Pending invite';
        arr.push({
          id: parent.id,
          name: friendlyName,
          email: parent.email,
          child_ids: childIds,
        });
        parentsByClassroom.set(cid, arr);
      }
    }
  }

  const teachersByClassroom = new Map<string, typeof teachers>();
  for (const cid of classrooms.map((c) => c.id)) teachersByClassroom.set(cid, []);
  for (const t of teachers) {
    if (t.classroom_id && teachersByClassroom.has(t.classroom_id)) {
      teachersByClassroom.get(t.classroom_id)!.push(t);
    }
  }

  // Flat parent list (school-wide).
  const allParents = new Map<string, { id: string; name: string; email: string; child_ids: string[]; classroom_ids: string[] }>();
  for (const [cid, list] of parentsByClassroom) {
    for (const p of list) {
      if (!allParents.has(p.id)) {
        allParents.set(p.id, { ...p, classroom_ids: [cid] });
      } else {
        const existing = allParents.get(p.id)!;
        existing.classroom_ids.push(cid);
      }
    }
  }

  return NextResponse.json({
    classrooms: classrooms.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color || null,
      icon: c.icon || null,
      teachers: (teachersByClassroom.get(c.id) || []).map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        role: t.role || 'teacher',
        login_code: t.login_code || null,
      })),
      parents: parentsByClassroom.get(c.id) || [],
      child_count: children.filter((c2) => c2.classroom_id === c.id).length,
    })),
    all_teachers: teachers.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      classroom_id: t.classroom_id || null,
      role: t.role || 'teacher',
    })),
    all_parents: Array.from(allParents.values()),
  });
}
