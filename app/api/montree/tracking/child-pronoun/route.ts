// app/api/montree/tracking/child-pronoun/route.ts
//
// PATCH /api/montree/tracking/child-pronoun  { child_id, pronoun }
//   → { ok: true, child_id, pronoun, pronoun_set }
//
// The one write behind the tracker's He · She toggle.
//
// WHY A ROUTE OF ITS OWN. /api/montree/children/[childId] is the roster editor:
// it takes a name, an age, a birthday, a photo, notes — a form a teacher fills
// in deliberately, and it does not accept this field. The toggle is a single
// tap on a grid row, and widening the roster editor's update map so a grid tap
// could reach it would put the roster's whole surface behind a tap target it
// was never designed for. This route writes exactly one column and nothing else.
//
// WHICH COLUMN. `montree_children.gender` (migration 119), in the spelling the
// rest of the app already uses — 'boy' / 'girl'. persistence.pronounFrom() has
// read it since the engine was built; there is no `pronoun` column and this
// route does not add one.
//
// 'they' IS NOT OFFERED AS A TARGET, but it is accepted here: it CLEARS the
// column. A teacher who set the wrong chip must be able to put the row back to
// "nobody has said", and the summary must then go back to repeating the name
// rather than narrating a pronoun no one chose (rule 11).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PronounInput = 'he' | 'she' | 'they';

/** The wire's pronoun → the `gender` column's value. 'they' means "unsaid". */
export const GENDER_FOR: Record<PronounInput, string | null> = {
  he: 'boy',
  she: 'girl',
  they: null,
};

export function parsePronoun(raw: unknown): PronounInput | null {
  const s = String(raw ?? '').trim().toLowerCase();
  return s === 'he' || s === 'she' || s === 'they' ? s : null;
}

export async function PATCH(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
  }

  const childId = String(body.child_id ?? '');
  if (!UUID_RE.test(childId)) {
    return NextResponse.json({ error: 'child_id required (UUID)' }, { status: 400 });
  }
  const pronoun = parsePronoun(body.pronoun);
  if (!pronoun) {
    return NextResponse.json({ error: "pronoun must be 'he', 'she' or 'they'" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Ownership, the same two-step every route in this folder uses: the child's
  // school must be the caller's, and a TEACHER may only touch their own
  // classroom. A principal may touch any classroom inside their school.
  const { data } = await supabase
    .from('montree_children')
    .select('id, classroom_id, school_id')
    .eq('id', childId)
    .maybeSingle();
  const child = data as { id: string; classroom_id: string | null; school_id: string | null } | null;
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

  const owned = await childBelongsToCaller(supabase, child, auth.schoolId);
  if (!owned) {
    return NextResponse.json({ error: 'Child not in your school' }, { status: 403 });
  }
  if (auth.role === 'teacher' && auth.classroomId && child.classroom_id !== auth.classroomId) {
    return NextResponse.json({ error: 'Child not in your classroom' }, { status: 403 });
  }

  const { error } = await supabase
    .from('montree_children')
    .update({ gender: GENDER_FOR[pronoun] })
    .eq('id', childId);

  if (error) {
    console.error('[tracking/child-pronoun] update failed:', error.message || error);
    return NextResponse.json({ error: 'Could not save that' }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, child_id: childId, pronoun, pronoun_set: pronoun !== 'they' },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

/**
 * `school_id` on montree_children is not populated everywhere, so a null there
 * falls back to the classroom's school — the same route the tracking child
 * route takes, and never a shortcut that lets a null mean "allowed".
 */
async function childBelongsToCaller(
  supabase: ReturnType<typeof getSupabase>,
  child: { classroom_id: string | null; school_id: string | null },
  schoolId: string,
): Promise<boolean> {
  if (child.school_id) return child.school_id === schoolId;
  if (!child.classroom_id) return false;
  const { data } = await supabase
    .from('montree_classrooms')
    .select('id, school_id')
    .eq('id', child.classroom_id)
    .maybeSingle();
  const row = data as { id: string; school_id: string } | null;
  return !!row && row.school_id === schoolId;
}
