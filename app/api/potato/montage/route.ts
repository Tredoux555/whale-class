// POST /api/potato/montage — the teacher taps "Make montage" for one child.
//
// Body: { childId, weekStart? }
//
// 🚨 media_ids are derived SERVER-side from that child's photos for that week,
// using the same query shape the board counted with. A client may never supply
// a media list — that is the security contract this product inherits from
// Montree, and it is also what keeps the film honest: what the bar showed is
// what the film contains.
//
// Every row in tp_montage_jobs is one deliberate tap. This table IS the ledger.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher, UUID_RE } from '@/lib/potato/auth';
import {
  potatoDb,
  loadClass,
  loadOwnedChild,
  loadWeekPhotos,
  isSetupPending,
  MONTAGE_THRESHOLD,
} from '@/lib/potato/db';
import { resolveWeekStart } from '@/lib/potato/week';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const payload = (body ?? {}) as { childId?: unknown; weekStart?: unknown };
  const childId = typeof payload.childId === 'string' ? payload.childId : '';
  if (!UUID_RE.test(childId)) {
    return NextResponse.json({ error: 'Invalid child id' }, { status: 400 });
  }

  try {
    const supabase = potatoDb();
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const child = await loadOwnedChild(supabase, session.classId, childId);
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

    const weekStart = resolveWeekStart(payload.weekStart ?? null, klass.tz);
    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart must be YYYY-MM-DD' }, { status: 400 });
    }

    // Don't stack jobs: a double tap while one is in flight returns the job
    // already running rather than burning another render.
    const { data: live, error: liveError } = await supabase
      .from('tp_montage_jobs')
      .select('id, status')
      .eq('class_id', session.classId)
      .eq('child_id', child.id)
      .eq('week_start', weekStart)
      .in('status', ['queued', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (liveError) throw liveError;
    if (live) {
      return NextResponse.json({
        ok: true,
        alreadyRunning: true,
        job: { id: live.id, status: live.status, weekStart },
      });
    }

    const week = await loadWeekPhotos(supabase, session.classId, weekStart, klass.tz);
    const mine = week.byChild.get(child.id) ?? [];

    if (mine.length < MONTAGE_THRESHOLD) {
      const short = MONTAGE_THRESHOLD - mine.length;
      return NextResponse.json(
        {
          error: `${child.name} needs ${MONTAGE_THRESHOLD} photos this week — ${mine.length} so far, ${short} to go.`,
          photoCount: mine.length,
          threshold: MONTAGE_THRESHOLD,
        },
        { status: 400 },
      );
    }

    const { data: job, error } = await supabase
      .from('tp_montage_jobs')
      .insert({
        class_id: session.classId,
        child_id: child.id,
        week_start: weekStart,
        status: 'queued',
        media_ids: mine.map((photo) => photo.id), // oldest first — the order of the film
      })
      .select('id, status, week_start, created_at')
      .maybeSingle();
    if (error) throw error;
    if (!job) throw new Error('Job row was not returned after insert');

    return NextResponse.json({
      ok: true,
      alreadyRunning: false,
      job: {
        id: job.id,
        status: job.status,
        weekStart: job.week_start,
        photoCount: mine.length,
        createdAt: job.created_at,
      },
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/montage] error:', error);
    return NextResponse.json({ error: 'Could not start that montage.' }, { status: 500 });
  }
}
