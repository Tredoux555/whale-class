// lib/montree/events/parent-access.ts
//
// Parent-side access guard for school events. Mirror of the messaging /
// appointments resolvers. Gated on the `school_events` feature flag.

import { NextResponse } from 'next/server';
import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { verifyParentSession } from '@/lib/montree/verify-parent-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';

export interface EventsParent {
  parentId: string;
  parentName: string;
  schoolId: string;
  childIds: string[];
  classroomIds: string[];
}

export async function resolveEventsParent(
  supabase: SupabaseClient
): Promise<EventsParent | NextResponse> {
  const session = await verifyParentSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Invite-only sessions: allow READ access, but no RSVP. We surface
  // child + classroom from the invite when possible.
  const supportInviteOnly = !!session.parentId === false;

  let parentId = session.parentId || '';
  let schoolId: string | undefined;
  let parentName = 'Parent';
  const childIds: string[] = [];

  if (session.parentId) {
    const { data: parent } = await supabase
      .from('montree_parents')
      .select('id, name, email, school_id, is_active')
      .eq('id', session.parentId)
      .maybeSingle();
    if (!parent || !parent.is_active) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 401 });
    }
    schoolId = parent.school_id;
    parentName = parent.name || parent.email;
    parentId = parent.id;
    const { data: links } = await supabase
      .from('montree_parent_children')
      .select('child_id')
      .eq('parent_id', parent.id);
    for (const l of (links || []) as Array<{ child_id: string }>) {
      childIds.push(l.child_id);
    }
  } else if (supportInviteOnly && session.childId) {
    // Invite-only: hydrate via the single child.
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, montree_classrooms!inner(school_id)')
      .eq('id', session.childId)
      .maybeSingle();
    const childRow = child as unknown as
      | { id: string; montree_classrooms: { school_id: string } | null }
      | null;
    if (!childRow || !childRow.montree_classrooms) {
      return NextResponse.json({ error: 'Child not found' }, { status: 401 });
    }
    schoolId = childRow.montree_classrooms.school_id;
    childIds.push(childRow.id);
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!schoolId) {
    return NextResponse.json({ error: 'School not resolved' }, { status: 401 });
  }

  const flagOn = await isFeatureEnabled(supabase, schoolId, 'school_events');
  if (!flagOn) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Hydrate classroom IDs from child set.
  const classroomIds: string[] = [];
  if (childIds.length > 0) {
    const { data: kidsRows } = await supabase
      .from('montree_children')
      .select('classroom_id')
      .in('id', childIds);
    for (const k of (kidsRows || []) as Array<{ classroom_id: string | null }>) {
      if (k.classroom_id) classroomIds.push(k.classroom_id);
    }
  }

  return {
    parentId,
    parentName,
    schoolId,
    childIds,
    classroomIds: Array.from(new Set(classroomIds)),
  };
}
