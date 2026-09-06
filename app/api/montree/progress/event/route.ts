// app/api/montree/progress/event/route.ts
//
// POST /api/montree/progress/event
//   { child_id, work, status, source, actor?, reason?, evidence_media_id?, classroom_id? }
//   → { outcome:'applied'|'noop'|'queued'|'rejected', work_key?, old_status?,
//       new_status?, why?, queue_id? }
//
// RULE 2 — ONE DOOR. This route is a THIN wrapper over
// lib/montree/progress/write-progress.ts: it validates, it enforces rule 3's
// source vocabulary and rule 4's reason requirement, and then it gets out of the
// way. Every ladder and dedupe decision is the engine's (ledger.applyEvent),
// reached through the door, so this route cannot develop its own idea of the rules.
//
// This is the endpoint digital works, live lessons and games call (rule 11:
// nothing is lost — but only when the child is KNOWN).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { writeProgress } from '@/lib/montree/progress/write-progress';
import type { Source } from '@/lib/montree/tracking/types';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rule 3's vocabulary, and nothing else. An unrecognised source is a 400, not a guess. */
const SOURCES: readonly Source[] = ['tap', 'photo', 'ai', 'digital', 'live', 'import', 'backfill', 'correction'];
const STATUSES = ['not_started', 'presented', 'practicing', 'mastered'] as const;
type Status = (typeof STATUSES)[number];

const RANK: Record<Status, number> = { not_started: 0, presented: 1, practicing: 2, mastered: 3 };

interface Body {
  child_id?: string;
  /** A work NAME or a work KEY — resolveWorkName / the door's resolver decides. */
  work?: string;
  status?: string;
  source?: string;
  actor?: string;
  reason?: string;
  evidence_media_id?: string;
  classroom_id?: string;
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ outcome: 'rejected', why: 'forbidden' }, { status: 403 });
  }

  let body: Body = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as Body;
  } catch {
    return NextResponse.json({ outcome: 'rejected', why: 'invalid-json' }, { status: 400 });
  }

  const childId = String(body.child_id || '').trim();
  const work = String(body.work || '').trim();
  const status = String(body.status || '').trim() as Status;
  const source = String(body.source || '').trim() as Source;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

  if (!UUID_RE.test(childId)) {
    return NextResponse.json({ outcome: 'rejected', why: 'child_id required (UUID)' }, { status: 400 });
  }
  if (!work) {
    return NextResponse.json({ outcome: 'rejected', why: 'work required' }, { status: 400 });
  }
  if (!(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json(
      { outcome: 'rejected', why: `status must be one of ${STATUSES.join(', ')}` },
      { status: 400 },
    );
  }
  if (!(SOURCES as readonly string[]).includes(source)) {
    // Rule 3 names eight sources. A caller inventing a ninth is a bug in the caller.
    return NextResponse.json(
      { outcome: 'rejected', why: `source must be one of ${SOURCES.join(', ')}` },
      { status: 400 },
    );
  }
  // Rule 4: a correction without a reason is not a correction.
  if (source === 'correction' && !reason) {
    return NextResponse.json(
      { outcome: 'rejected', why: 'correction requires a reason' },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  // The child must be in the caller's school; classroom_id is derived from the
  // child, never trusted from the body (a body value is only ever a hint).
  const { data: childRow } = await supabase
    .from('montree_children')
    .select('id, classroom_id, school_id')
    .eq('id', childId)
    .maybeSingle();
  const child = childRow as { id: string; classroom_id: string | null; school_id: string | null } | null;
  if (!child) {
    return NextResponse.json({ outcome: 'rejected', why: 'child-not-found' }, { status: 404 });
  }
  if (child.school_id && child.school_id !== auth.schoolId) {
    return NextResponse.json({ outcome: 'rejected', why: 'child-not-in-your-school' }, { status: 403 });
  }
  if (auth.role === 'teacher' && auth.classroomId && child.classroom_id !== auth.classroomId) {
    return NextResponse.json({ outcome: 'rejected', why: 'child-not-in-your-classroom' }, { status: 403 });
  }

  // Rule 4 — DOWNGRADE ONLY WITH SOURCE 'correction'. The door is asked to allow a
  // downgrade only when the caller said 'correction'; every other source is rank-gated,
  // so an automated observation can never move a child back down the ladder.
  const result = await writeProgress(
    supabase,
    {
      childId,
      workName: work,
      area: null,
      status,
      source,
      classroomId: child.classroom_id ?? body.classroom_id ?? null,
      schoolId: child.school_id ?? null,
      allowDowngrade: source === 'correction',
      reason: reason || null,
      evidenceId: body.evidence_media_id ?? null,
      evidenceMediaId: body.evidence_media_id ?? null,
    },
    { actor: body.actor ?? auth.userId ?? null },
  );

  if (result.outcome === 'queued') {
    // Rule 5: the name could not be keyed, so nothing was written and a human decides.
    const queueId = await findQueueId(supabase, childId, result.workName);
    return NextResponse.json({
      outcome: 'queued' as const,
      why: result.reason ?? 'unresolved-work',
      ...(queueId ? { queue_id: queueId } : {}),
    });
  }
  if (result.outcome === 'failed') {
    return NextResponse.json(
      { outcome: 'rejected' as const, why: result.error || 'write-failed' },
      { status: 500 },
    );
  }
  if (result.outcome === 'written') {
    return NextResponse.json({
      outcome: 'applied' as const,
      work_key: result.workKey,
      old_status: result.previousStatus,
      new_status: result.status,
    });
  }

  // skipped_noop / skipped_rank. A repeat observation is a NOOP (the evidence was
  // still journalled by the door); a refused downgrade is a REJECTION, because the
  // caller asked for something rule 4 forbids and should be told so.
  const refused =
    result.outcome === 'skipped_rank' ||
    result.reason === 'backward-without-correction' ||
    result.reason === 'correction-without-reason';
  const previous = result.previousStatus;
  const wentDown =
    previous !== null &&
    (RANK[previous as Status] ?? 0) > (RANK[status] ?? 0);

  return NextResponse.json({
    outcome: refused || wentDown ? ('rejected' as const) : ('noop' as const),
    work_key: result.workKey,
    old_status: previous,
    new_status: result.status,
    why: result.reason ?? (refused ? 'refused' : 'no-change'),
  });
}

/** The queue row the door just wrote, so the caller can offer "resolve this" inline. */
async function findQueueId(
  supabase: ReturnType<typeof getSupabase>,
  childId: string,
  rawWorkName: string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('montree_progress_review_queue')
      .select('id')
      .eq('child_id', childId)
      .eq('raw_work_name', rawWorkName)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as { id?: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}
