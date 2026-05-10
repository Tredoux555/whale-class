// /api/montree/parent/messages/recipients/route.ts
// Session 98 — list valid recipients per child for the parent's compose modal.
//
// Returns one bundle per child: { child, classroom, teachers[], principal }.
// Teachers are the active teachers in the child's classroom. Principal is
// the school's primary principal (oldest active row in montree_school_admins).

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingParent } from '@/lib/montree/parent-messaging/access';
import type { ParentRecipientBundle, ParentRecipientOption } from '@/lib/montree/parent-messaging/types';

export const dynamic = 'force-dynamic';

interface ChildRow {
  id: string;
  name: string;
  classroom_id: string | null;
  is_active: boolean;
}

interface ClassroomRow {
  id: string;
  name: string;
}

interface TeacherRow {
  id: string;
  name: string;
  classroom_id: string;
  role: string | null;
  is_active: boolean;
}

interface PrincipalRow {
  id: string;
  name: string;
}

export async function GET() {
  const supabase = getSupabase();
  const parent = await resolveMessagingParent(supabase);
  if (parent instanceof NextResponse) return parent;

  // 1. Children + classrooms (active only).
  const { data: childRows } = await supabase
    .from('montree_children')
    .select('id, name, classroom_id, is_active')
    .in('id', parent.childIds)
    .eq('is_active', true);
  const children = (childRows || []) as ChildRow[];
  if (!children.length) return NextResponse.json({ recipients: [] });

  const classroomIds = Array.from(new Set(children.map((c) => c.classroom_id).filter(Boolean))) as string[];

  // 2. Classrooms.
  const { data: classroomRows } = classroomIds.length
    ? await supabase
        .from('montree_classrooms')
        .select('id, name')
        .in('id', classroomIds)
    : { data: [] as ClassroomRow[] };
  const classroomById = new Map<string, string>();
  for (const c of (classroomRows || []) as ClassroomRow[]) classroomById.set(c.id, c.name);

  // 3. All active teachers in those classrooms (school-scoped belt-and-braces).
  const { data: teacherRows } = classroomIds.length
    ? await supabase
        .from('montree_teachers')
        .select('id, name, classroom_id, role, is_active')
        .eq('school_id', parent.schoolId)
        .in('classroom_id', classroomIds)
        .eq('is_active', true)
    : { data: [] as TeacherRow[] };

  const teachersByClassroom = new Map<string, ParentRecipientOption[]>();
  for (const t of (teacherRows || []) as TeacherRow[]) {
    const arr = teachersByClassroom.get(t.classroom_id) || [];
    arr.push({
      role: 'teacher',
      id: t.id,
      name: t.name,
      classroom_name: classroomById.get(t.classroom_id) || null,
      is_lead: t.role === 'lead' || t.role === 'lead_teacher',
    });
    teachersByClassroom.set(t.classroom_id, arr);
  }
  // Sort: lead first, then alpha.
  for (const arr of teachersByClassroom.values()) {
    arr.sort((a, b) => {
      if ((a.is_lead ?? false) !== (b.is_lead ?? false)) {
        return a.is_lead ? -1 : 1;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  // 4. Principal (oldest active school admin in the school).
  const { data: principalRow } = await supabase
    .from('montree_school_admins')
    .select('id, name')
    .eq('school_id', parent.schoolId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  const principal: ParentRecipientOption | null = principalRow
    ? {
        role: 'principal',
        id: (principalRow as PrincipalRow).id,
        name: (principalRow as PrincipalRow).name,
      }
    : null;

  // 5. Build the bundles.
  const bundles: ParentRecipientBundle[] = children.map((c) => ({
    child_id: c.id,
    child_name: c.name,
    classroom_id: c.classroom_id,
    classroom_name: c.classroom_id ? classroomById.get(c.classroom_id) || null : null,
    teachers: c.classroom_id ? teachersByClassroom.get(c.classroom_id) || [] : [],
    principal,
  }));

  return NextResponse.json({ recipients: bundles });
}
