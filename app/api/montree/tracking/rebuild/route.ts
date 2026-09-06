// app/api/montree/tracking/rebuild/route.ts
//
// POST /api/montree/tracking/rebuild  { child_id? | classroom_id? } → { rebuilt: n }
//
// RULE 3 — the current-status table is a CACHE of the journal, and a cache you
// cannot rebuild is not a cache, it is a second source of truth. This is the
// rebuild button: it discards what montree_child_progress says and recomputes it
// from montree_progress_events with the engine.
//
// The computation is lib/montree/tracking/persistence.ts rebuildChildProgress()
// (which hands the rows to the door — rule 2, this route writes nothing itself).
// Its server-side twin montree_rebuild_child_progress(uuid) (migration 346) does
// the identical thing inside Postgres; we prefer the TypeScript path here because
// it runs the SAME ledger.replay() the readers run, so a disagreement between the
// two is a real finding rather than an artefact of the rebuild.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { rebuildChildProgress } from '@/lib/montree/tracking/persistence';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A whole-classroom rebuild is a bulk operation; bound it so one tap cannot stall a dyno. */
const MAX_CHILDREN = 200;

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { child_id?: string; classroom_id?: string } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = getSupabase();
  const childId = String(body.child_id || '').trim();
  const classroomId = String(body.classroom_id || auth.classroomId || '').trim();

  let targets: string[] = [];

  if (childId) {
    if (!UUID_RE.test(childId)) {
      return NextResponse.json({ error: 'child_id must be a UUID' }, { status: 400 });
    }
    const { data } = await supabase
      .from('montree_children')
      .select('id, classroom_id, school_id')
      .eq('id', childId)
      .maybeSingle();
    const child = data as { id: string; classroom_id: string | null; school_id: string | null } | null;
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    if (child.school_id && child.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Child not in your school' }, { status: 403 });
    }
    if (auth.role === 'teacher' && auth.classroomId && child.classroom_id !== auth.classroomId) {
      return NextResponse.json({ error: 'Child not in your classroom' }, { status: 403 });
    }
    targets = [childId];
  } else {
    if (!classroomId || !UUID_RE.test(classroomId)) {
      return NextResponse.json({ error: 'child_id or classroom_id required' }, { status: 400 });
    }
    if (auth.classroomId !== classroomId) {
      const { data } = await supabase
        .from('montree_classrooms')
        .select('id, school_id')
        .eq('id', classroomId)
        .maybeSingle();
      const row = data as { school_id: string } | null;
      if (!row || row.school_id !== auth.schoolId) {
        return NextResponse.json({ error: 'Classroom not in your school' }, { status: 403 });
      }
    }
    const { data } = await supabase
      .from('montree_children')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .limit(MAX_CHILDREN);
    targets = ((data || []) as Array<{ id: string }>).map((c) => c.id);
  }

  let rebuilt = 0;
  const failed: Array<{ child_id: string; error: string }> = [];
  for (const id of targets) {
    // Sequential on purpose: a rebuild is rare, and a burst of parallel upserts on
    // the same table is how a rebuild turns into an incident.
    const result = await rebuildChildProgress(supabase, id);
    if (result.error) failed.push({ child_id: id, error: result.error });
    else rebuilt += result.written;
  }

  return NextResponse.json({
    rebuilt,
    children: targets.length,
    ...(failed.length ? { failed } : {}),
  });
}
