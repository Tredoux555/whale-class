// /api/montree/montage/send
//
// "Send to parents" for a finished Montage Manager / Studio montage.
//
//   POST { job_id }
//        → stamps montree_montage_jobs.sent_at (migration 307), which is the
//          ONLY thing that makes the film visible in the parent feed
//          (GET /api/montree/parent/montages), then push-notifies the
//          parents of every child in scope.
//
// Why a column and not a side table: the montage row already carries its own
// scope (child / classroom / event), so "is this shared with parents?" is one
// nullable timestamp on the row that owns the answer. NULL = teacher-only,
// which is exactly the historical behaviour of every pre-307 row.
//
// 🚨 The push is BEST-EFFORT. Delivery of the montage is the sent_at stamp —
// the parent sees the film in their feed whether or not APNs/FCM cooperates.
// A push failure therefore logs and still returns 200; making it fatal would
// leave a sent montage looking un-sent to the teacher and invite a re-send
// storm.
//
// Re-sending is allowed and idempotent-ish: sent_at moves to now() and the
// parents get another nudge. That's the intended affordance for "I fixed the
// film / they missed it".
//
// 42703-safe: before migration 307 the sent_at column doesn't exist, so the
// stamp degrades to a clean 503 { error: 'not_migrated' } instead of a 500.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Children per classroom is bounded in practice; cap defensively. */
const MAX_RECIPIENT_CHILDREN = 500;

function isMissingSchema(code?: string): boolean {
  return code === '42P01' || code === '42703';
}

interface MontageJobRow {
  id: string;
  school_id: string | null;
  classroom_id: string | null;
  scope_type: string | null;
  child_id: string | null;
  event_id: string | null;
  status: string | null;
  output_path: string | null;
  title: string | null;
}

/**
 * Everyone who should hear about this film.
 *
 * child      → that one child.
 * classroom  → every child in the job's classroom.
 * event      → every child in the EVENT's classroom (an event carries its own
 *              classroom_id; the job's is only a fallback for legacy rows).
 *
 * Returns [] when the scope resolves to nothing — the caller still stamps
 * sent_at (the film belongs in the feed regardless) and simply skips the push.
 */
async function resolveRecipientChildIds(
  supabase: ReturnType<typeof getSupabase>,
  job: MontageJobRow,
  schoolId: string
): Promise<string[]> {
  if (job.scope_type === 'child') {
    return job.child_id ? [job.child_id] : [];
  }

  let classroomId: string | null = job.classroom_id;

  if (job.scope_type === 'event') {
    if (!job.event_id) return [];
    // 🚨 School-scoped read — an event id from another school must never
    // resolve to a classroom we then blast.
    const { data: event } = await supabase
      .from('montree_events')
      .select('classroom_id')
      .eq('id', job.event_id)
      .eq('school_id', schoolId)
      .maybeSingle();
    if (!event) return [];
    classroomId = (event as { classroom_id?: string | null }).classroom_id ?? job.classroom_id;
  }

  if (!classroomId) return [];

  const { data: children, error } = await supabase
    .from('montree_children')
    .select('id')
    .eq('classroom_id', classroomId)
    .limit(MAX_RECIPIENT_CHILDREN);
  if (error) {
    console.error('[montage-send] classroom children lookup failed:', error.message);
    return [];
  }
  const rows = ((children || []) as unknown) as Array<{ id?: string | null }>;
  return rows
    .map((c) => c.id)
    .filter((id): id is string => typeof id === 'string' && !!id);
}

/** Push copy, mirroring the report-montage wording in /internal/montage-complete. */
function pushCopyFor(job: MontageJobRow): { title: string; body: string } {
  const label = (job.title || '').trim();
  if (job.scope_type === 'child') {
    return {
      title: '✨ A little film',
      body: label ? `${label}'s little film is ready to watch.` : 'A little film is ready to watch.',
    };
  }
  if (job.scope_type === 'event') {
    return {
      title: '✨ A little film',
      body: label ? `A film from ${label} is ready to watch.` : 'A film from a special day is ready to watch.',
    };
  }
  return {
    title: '✨ A little film',
    body: label ? `A new film from ${label} is ready to watch.` : 'A new classroom film is ready to watch.',
  };
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  // Sharing with parents is a classroom act — teachers and principals only,
  // same gate as the montage queue/list route.
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const jobId = typeof body.job_id === 'string' ? body.job_id : '';
  if (!jobId || !UUID_RE.test(jobId)) {
    return NextResponse.json({ error: 'job_id must be a uuid' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // --- load + authorize the job -----------------------------------------
    // 🚨 The school filter is on the QUERY, not a post-hoc comparison, so a
    // job id from another school is indistinguishable from a typo (404).
    const { data: jobRow, error: jobErr } = await supabase
      .from('montree_montage_jobs')
      .select('id, school_id, classroom_id, scope_type, child_id, event_id, status, output_path, title')
      .eq('id', jobId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (jobErr) {
      if (isMissingSchema(jobErr.code)) {
        return NextResponse.json({ error: 'not_migrated' }, { status: 503 });
      }
      console.error('[montage-send] job lookup failed:', jobErr.message);
      return NextResponse.json({ error: 'Failed to send montage' }, { status: 500 });
    }
    if (!jobRow) {
      return NextResponse.json({ error: 'Montage not found' }, { status: 404 });
    }
    const job = (jobRow as unknown) as MontageJobRow;

    // A teacher is pinned to her own classroom — she may only release films
    // from that room. A principal (no classroomId on the token) may release
    // any of her school's. Legacy rows with no classroom_id fall through to
    // the school check alone.
    if (auth.classroomId && job.classroom_id && job.classroom_id !== auth.classroomId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Report montages already reach parents with the weekly report itself and
    // have their own push on the montage-complete callback. Sending one here
    // would double-notify and deep-link into the wrong surface.
    if (job.scope_type === 'report') {
      return NextResponse.json(
        { error: 'Report montages are delivered with the weekly report' },
        { status: 400 }
      );
    }
    if (job.status !== 'done') {
      return NextResponse.json({ error: 'Montage is not finished yet' }, { status: 409 });
    }
    if (!job.output_path) {
      return NextResponse.json({ error: 'Montage has no video file' }, { status: 409 });
    }

    // --- stamp sent_at (this IS the delivery) ------------------------------
    const sentAt = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('montree_montage_jobs')
      .update({ sent_at: sentAt })
      .eq('id', job.id)
      .eq('school_id', auth.schoolId);

    if (updateErr) {
      if (isMissingSchema(updateErr.code)) {
        return NextResponse.json({ error: 'not_migrated' }, { status: 503 });
      }
      console.error('[montage-send] sent_at update failed:', updateErr.message);
      return NextResponse.json({ error: 'Failed to send montage' }, { status: 500 });
    }

    // --- notify (best effort — never fails the send) -----------------------
    let pushState: 'sent' | 'skipped_no_children' | 'failed' = 'failed';
    let pushSent = 0;
    try {
      const childIds = await resolveRecipientChildIds(supabase, job, auth.schoolId);
      if (!childIds.length) {
        pushState = 'skipped_no_children';
      } else {
        const { pushToParentsOfChildren } = await import('@/lib/montree/push/sender');
        const copy = pushCopyFor(job);
        const result = await pushToParentsOfChildren(
          supabase,
          childIds,
          {
            title: copy.title,
            body: copy.body,
            data: { url: '/montree/parent/montages', type: 'montage' },
          },
          { requireViewReports: true }
        );
        pushState = 'sent';
        pushSent = result.sent;
      }
    } catch (e) {
      // 🚨 Swallowed on purpose. The montage is in the parent feed the moment
      // sent_at is stamped; a dead push provider must not make the teacher
      // think the send failed.
      console.error('[montage-send] push dispatch error:', e);
      pushState = 'failed';
    }

    return NextResponse.json({
      success: true,
      sent_at: sentAt,
      push: pushState,
      push_sent: pushSent,
    });
  } catch (error) {
    console.error('[montage-send] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
