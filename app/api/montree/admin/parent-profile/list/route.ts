// app/api/montree/admin/parent-profile/list/route.ts
//
// Ultimate Astra Phase A — list every parent in the school with their
// profile summary (archetype tags, meeting count, last meeting date) and
// linked child names.
//
// Used by:
//   - The /montree/admin/parents page (Phase D)
//   - Astra's `list_parents_for_school` tool (Phase A — tool dispatch)
//
// SCHOOL-SCOPING:
//   Hard-scoped on auth.schoolId. No exceptions.
//
// SHAPE:
//   {
//     parents: Array<{
//       parent_id, parent_name, parent_email,
//       child_names: string[],
//       child_ids: string[],
//       archetypes: string[],
//       relationship_temperature: string,
//       meeting_count: number,
//       last_meeting_date: string | null,
//       has_profile: boolean,
//     }>,
//     migration_pending?: boolean
//   }

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const maxDuration = 30;

function isMigrationMissing(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return e.code === '42P01' || (e.message ?? '').includes('does not exist');
}

interface ParentRow {
  id: string;
  name: string | null;
  email: string | null;
  is_active: boolean | null;
}

interface JunctionRow {
  parent_id: string;
  child_id: string;
}

interface ChildRow {
  id: string;
  name: string;
  classroom_id: string | null;
  is_active: boolean | null;
}

interface ProfileRow {
  id: string;
  parent_id: string;
  archetypes: string[] | null;
  relationship_temperature: string | null;
  meeting_count: number | null;
  last_meeting_date: string | null;
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal' && auth.role !== 'teacher') {
    return NextResponse.json(
      { error: 'Only principals or teachers can list parents.' },
      { status: 403 }
    );
  }

  const supabase = getSupabase();
  const url = new URL(request.url);
  const classroomFilter = url.searchParams.get('classroom_id') || null;

  // 1. Pull every parent for this school.
  const { data: parentRows, error: parentErr } = await supabase
    .from('montree_parents')
    .select('id, name, email, is_active')
    .eq('school_id', auth.schoolId)
    .order('name', { ascending: true, nullsFirst: false });

  if (parentErr) {
    if (isMigrationMissing(parentErr)) {
      return NextResponse.json({ migration_pending: true, parents: [] });
    }
    return NextResponse.json({ error: parentErr.message }, { status: 500 });
  }

  const parents: ParentRow[] = (parentRows as ParentRow[]) ?? [];
  if (parents.length === 0) {
    return NextResponse.json(
      { parents: [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  const parentIds = parents.map((p) => p.id);

  // 2. Pull the parent_children junction.
  const { data: junctionRows, error: junctionErr } = await supabase
    .from('montree_parent_children')
    .select('parent_id, child_id')
    .in('parent_id', parentIds);

  if (junctionErr) {
    return NextResponse.json({ error: junctionErr.message }, { status: 500 });
  }

  const junction: JunctionRow[] = (junctionRows as JunctionRow[]) ?? [];
  const allChildIds = Array.from(new Set(junction.map((j) => j.child_id)));

  // 3. Pull children + filter belt-and-braces by school via classroom.school_id.
  let children: ChildRow[] = [];
  if (allChildIds.length > 0) {
    const { data: childRows, error: childErr } = await supabase
      .from('montree_children')
      .select('id, name, classroom_id, is_active')
      .in('id', allChildIds)
      .eq('is_active', true);
    if (childErr) {
      return NextResponse.json({ error: childErr.message }, { status: 500 });
    }
    const allChildren = (childRows as ChildRow[]) ?? [];

    // School-scope via classroom.
    if (allChildren.length > 0) {
      const classroomIds = Array.from(
        new Set(allChildren.map((c) => c.classroom_id).filter((id): id is string => !!id))
      );
      if (classroomIds.length > 0) {
        const { data: classroomRows } = await supabase
          .from('montree_classrooms')
          .select('id, school_id')
          .in('id', classroomIds);
        const allowedClassroomIds = new Set(
          (classroomRows ?? [])
            .filter((c) => c.school_id === auth.schoolId)
            .map((c) => c.id)
        );
        children = allChildren.filter(
          (c) => c.classroom_id && allowedClassroomIds.has(c.classroom_id)
        );
      }
    }
  }

  // Optional classroom filter narrows the parent list to parents whose
  // children are in the specified classroom.
  let childrenById = new Map(children.map((c) => [c.id, c]));
  if (classroomFilter) {
    const filtered = children.filter((c) => c.classroom_id === classroomFilter);
    childrenById = new Map(filtered.map((c) => [c.id, c]));
  }

  // 4. Pull profile rows (gracefully fall back if migration not run).
  let profilesByParent = new Map<string, ProfileRow>();
  try {
    const { data: profileRows, error: profileErr } = await supabase
      .from('montree_parent_profiles')
      .select('id, parent_id, archetypes, relationship_temperature, meeting_count, last_meeting_date')
      .eq('school_id', auth.schoolId)
      .in('parent_id', parentIds);

    if (profileErr) {
      if (!isMigrationMissing(profileErr)) {
        return NextResponse.json({ error: profileErr.message }, { status: 500 });
      }
      // migration pending — skip the profile join
    } else {
      profilesByParent = new Map(
        ((profileRows as ProfileRow[]) ?? []).map((p) => [p.parent_id, p])
      );
    }
  } catch (err) {
    if (!isMigrationMissing(err)) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'unknown error' },
        { status: 500 }
      );
    }
  }

  // 5. Compose response, applying classroom filter.
  const result = parents
    .map((p) => {
      const linkedJunctions = junction.filter((j) => j.parent_id === p.id);
      const linkedChildren = linkedJunctions
        .map((j) => childrenById.get(j.child_id))
        .filter((c): c is ChildRow => !!c);
      const profile = profilesByParent.get(p.id);
      return {
        parent_id: p.id,
        parent_name: p.name ?? '',
        parent_email: p.email ?? '',
        is_active: p.is_active !== false,
        child_names: linkedChildren.map((c) => c.name),
        child_ids: linkedChildren.map((c) => c.id),
        archetypes: profile?.archetypes ?? [],
        relationship_temperature: profile?.relationship_temperature ?? null,
        meeting_count: profile?.meeting_count ?? 0,
        last_meeting_date: profile?.last_meeting_date ?? null,
        has_profile: !!profile,
      };
    })
    // If classroom filter is on, hide parents with no linked children in that classroom.
    .filter((row) => !classroomFilter || row.child_ids.length > 0);

  return NextResponse.json(
    { parents: result },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
