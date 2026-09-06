// app/api/montree/tracking/review-queue/resolve/route.ts
//
// POST /api/montree/tracking/review-queue/resolve
//   { id, work_key }   → replay the refused observation onto that work
//   { id, dismiss:true } → close it without writing anything
//   → { outcome:'applied'|'noop'|'dismissed'|'rejected', work_key?, old_status?, new_status?, why? }
//
// RULE 5's second half. Rule 5 says an unresolvable name never writes; it does NOT
// say the observation is thrown away (rule 11). The queue row holds exactly what the
// caller wanted — child, raw name, requested status, source, evidence — and this
// route replays it through the door once a human has said what the name meant.
//
// The replay goes through writeProgress like everything else, so the ladder, the
// same-day dedupe and the journal all apply to a resolved observation exactly as
// they would have applied on the day. The row is marked resolved either way: a
// resolution that turns out to be a no-op (the child was already there) is still a
// resolution, and leaving it open would ask the teacher the same question tomorrow.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { writeProgress } from '@/lib/montree/progress/write-progress';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface QueueRow {
  id: string;
  child_id: string;
  classroom_id: string | null;
  school_id: string | null;
  raw_work_name: string;
  area: string | null;
  requested_status: string | null;
  source: string | null;
  actor: string | null;
  evidence_media_id: string | null;
  resolved_at: string | null;
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ outcome: 'rejected', why: 'forbidden' }, { status: 403 });
  }

  let body: { id?: string; work_key?: string; dismiss?: boolean } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ outcome: 'rejected', why: 'invalid-json' }, { status: 400 });
  }

  const id = String(body.id || '').trim();
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ outcome: 'rejected', why: 'id required (UUID)' }, { status: 400 });
  }
  const dismiss = body.dismiss === true;
  const workKey = String(body.work_key || '').trim();
  if (!dismiss && !workKey) {
    return NextResponse.json(
      { outcome: 'rejected', why: 'work_key required (or dismiss:true)' },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('montree_progress_review_queue')
    .select('id, child_id, classroom_id, school_id, raw_work_name, area, requested_status, source, actor, evidence_media_id, resolved_at')
    .eq('id', id)
    .maybeSingle();
  if (error && error.code === '42P01') {
    return NextResponse.json(
      { outcome: 'rejected', why: 'Migration 345 not yet run', migration_pending: true },
      { status: 503 },
    );
  }
  const row = data as QueueRow | null;
  if (!row) return NextResponse.json({ outcome: 'rejected', why: 'not-found' }, { status: 404 });
  if (row.resolved_at) {
    return NextResponse.json({ outcome: 'noop', why: 'already-resolved' });
  }

  // The queued observation belongs to a child; that child must be in the caller's
  // school. The queue row's own school_id stamp can be null (it is best-effort at
  // write time), so the child row is the authority.
  const { data: childRow } = await supabase
    .from('montree_children')
    .select('id, classroom_id, school_id')
    .eq('id', row.child_id)
    .maybeSingle();
  const child = childRow as { classroom_id: string | null; school_id: string | null } | null;
  if (!child) return NextResponse.json({ outcome: 'rejected', why: 'child-not-found' }, { status: 404 });
  if (child.school_id && child.school_id !== auth.schoolId) {
    return NextResponse.json({ outcome: 'rejected', why: 'not-your-school' }, { status: 403 });
  }

  // Rule 1: the human's answer must name a REAL curriculum work. Without this
  // check the queue is a hole in rule 5 — the resolver writes with strict:false,
  // so a typo'd or invented key would land in montree_child_progress as a key
  // no rollup, sequence or ribbon can ever find.
  if (!dismiss) {
    const classroomId = child.classroom_id ?? row.classroom_id;
    if (!classroomId) {
      return NextResponse.json({ outcome: 'rejected', why: 'child-has-no-classroom' }, { status: 400 });
    }
    const { data: workRow } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('work_key')
      .eq('classroom_id', classroomId)
      .eq('work_key', workKey)
      .limit(1)
      .maybeSingle();
    if (!workRow) {
      return NextResponse.json(
        { outcome: 'rejected', why: 'work_key not in this classroom curriculum' },
        { status: 400 },
      );
    }
  }

  if (dismiss) {
    await closeRow(supabase, id, null);
    return NextResponse.json({ outcome: 'dismissed' as const });
  }

  const result = await writeProgress(
    supabase,
    {
      childId: row.child_id,
      // The RAW name is kept as the row's name so the teacher still recognises it,
      // but the KEY is the human's answer — which is what every rollup reads.
      workName: row.raw_work_name,
      workKey,
      area: row.area,
      status: row.requested_status || 'presented',
      source: row.source || 'tap',
      classroomId: child.classroom_id ?? row.classroom_id,
      schoolId: child.school_id ?? row.school_id,
      evidenceId: row.evidence_media_id,
      evidenceMediaId: row.evidence_media_id,
      reason: `review-queue resolve: "${row.raw_work_name}" → ${workKey}`,
      // The key is now known, so rule 5 has nothing left to refuse.
      strict: false,
    },
    { actor: auth.userId ?? row.actor ?? null },
  );

  if (result.outcome === 'failed') {
    return NextResponse.json(
      { outcome: 'rejected' as const, why: result.error || 'write-failed' },
      { status: 500 },
    );
  }

  await closeRow(supabase, id, workKey);

  return NextResponse.json({
    outcome: result.outcome === 'written' ? ('applied' as const) : ('noop' as const),
    work_key: result.workKey,
    old_status: result.previousStatus,
    new_status: result.status,
    ...(result.reason ? { why: result.reason } : {}),
  });
}

async function closeRow(
  supabase: ReturnType<typeof getSupabase>,
  id: string,
  workKey: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('montree_progress_review_queue')
    .update({ resolved_at: new Date().toISOString(), resolved_work_key: workKey })
    .eq('id', id);
  if (error) console.error('[review-queue/resolve] close failed:', error.message || error);
}
