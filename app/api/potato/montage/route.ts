// POST /api/potato/montage — the teacher taps "Make montage" for one child.
//
// Body: { childId, weekStart? }
//
// 🚨 media_ids are derived SERVER-side from that child's photos for that week,
// using the same query shape the board counted with.
//
// v1.3 adds an optional `excludedMediaIds` — the mini-picker's deselect model.
// The client still may NOT supply a media list: it may only SUBTRACT from the
// set the server already derived. Anything it names that is not one of this
// child's photos this week is simply not in the set to remove, so the worst a
// hostile caller can do is make its own child's film shorter. That keeps the
// original security contract intact while letting a teacher drop the blurry
// ones — which is the whole point of the picker.
//
// Every row in tp_montage_jobs is one deliberate tap. This table IS the ledger.

import { NextRequest, NextResponse } from 'next/server';
import { UUID_RE } from '@/lib/potato/auth';
import {
  resolvePotatoTeacher,
  withPotatoCors,
  potatoOptionsHandler,
} from '@/lib/potato/app-auth';
import {
  potatoDb,
  loadClass,
  loadOwnedChild,
  loadWeekPhotos,
  isSetupPending,
  MONTAGE_THRESHOLD,
  CHILD_FILM_MIN,
} from '@/lib/potato/db';
import { resolveWeekStart } from '@/lib/potato/week';

export const dynamic = 'force-dynamic';

/** Standalone-app preflight. A no-op for the website, which never preflights. */
export const OPTIONS = potatoOptionsHandler;

export async function POST(request: NextRequest) {
  // withPotatoCors is a no-op unless the caller is an allow-listed app origin,
  // so the website's response is byte-identical to before.
  return withPotatoCors(await handlePOST(request), request);
}

async function handlePOST(request: NextRequest) {
  const session = await resolvePotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const payload = (body ?? {}) as {
    childId?: unknown;
    weekStart?: unknown;
    excludedMediaIds?: unknown;
  };
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
    const derived = week.byChild.get(child.id) ?? [];

    // Subtract whatever the teacher tapped out. Absent field = v1.2 behaviour,
    // so an older cached bundle keeps working untouched.
    const excluded = new Set(
      Array.isArray(payload.excludedMediaIds)
        ? payload.excludedMediaIds.filter(
            (v): v is string => typeof v === 'string' && UUID_RE.test(v),
          )
        : [],
    );
    const usedPicker = excluded.size > 0;
    const mine = derived.filter((photo) => !excluded.has(photo.id));

    // The floor. Below four there is no film to speak of; between four and
    // eight the UI nudges and lets her through.
    if (mine.length < CHILD_FILM_MIN) {
      const message = usedPicker
        ? `Keep at least ${CHILD_FILM_MIN} photos — ${mine.length} left in ${child.name}’s film.`
        : `${child.name} needs at least ${CHILD_FILM_MIN} photos this week — ${derived.length} so far.`;
      return NextResponse.json(
        {
          error: message,
          photoCount: mine.length,
          available: derived.length,
          threshold: CHILD_FILM_MIN,
          encouraged: MONTAGE_THRESHOLD,
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
