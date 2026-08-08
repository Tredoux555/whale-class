// /api/potato/class-film — one weekly film for the whole class.
//
//   GET  ?week=YYYY-MM-DD  → the picker payload, in ONE round trip:
//                            the week's photos (proxy url, captured_at, day
//                            label, tagged child ids) + the active roster.
//   POST { weekStart, mediaIds[], excusedChildIds[] } → queue the render.
//
// 🚨 POST is the ONLY endpoint in this product that accepts a client-chosen
// media list. Curation is the feature — the teacher picks the twenty photos
// that tell the week. What makes that safe is that every id is checked against
// the photos this class actually took in this week before anything is written.
// See lib/potato/classfilm.ts for the rule and why it exists.

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher } from '@/lib/potato/auth';
import {
  potatoDb,
  loadClass,
  listChildren,
  loadWeekPhotos,
  potatoCapabilities,
  isSetupPending,
  proxyUrl,
} from '@/lib/potato/db';
import { resolveWeekStart, weekLabel, dayLabelInZone, dayKeyInZone } from '@/lib/potato/week';
import {
  validateClassFilm,
  estimateSeconds,
  CLASS_FILM_MIN,
  CLASS_FILM_MAX,
} from '@/lib/potato/classfilm';

export const dynamic = 'force-dynamic';

const NOT_MIGRATED = () =>
  NextResponse.json({ error: 'setup_pending' }, { status: 503 });

// ------------------------------------------------------------------- GET ---

export async function GET(request: NextRequest) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  try {
    const supabase = potatoDb();
    const caps = await potatoCapabilities(supabase);
    // Nothing honest to degrade to on this screen — it exists only in v1.1.
    if (!caps.jobs) return NOT_MIGRATED();

    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const weekStart = resolveWeekStart(new URL(request.url).searchParams.get('week'), klass.tz);
    if (!weekStart) {
      return NextResponse.json({ error: 'week must be YYYY-MM-DD' }, { status: 400 });
    }

    const [children, week] = await Promise.all([
      listChildren(supabase, session.classId),
      loadWeekPhotos(supabase, session.classId, weekStart, klass.tz),
    ]);

    // The latest class job for the week, so the picker can refuse to open a
    // second render while one is already cooking.
    const { data: liveJob, error: jobError } = await supabase
      .from('tp_montage_jobs')
      .select('id, status, excused_child_ids, media_ids, created_at')
      .eq('class_id', session.classId)
      .eq('week_start', weekStart)
      .eq('kind', 'class')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (jobError) throw jobError;

    return NextResponse.json({
      ok: true,
      class: {
        id: klass.id,
        name: klass.name,
        emblemUrl: proxyUrl(klass.emblem_path ?? null),
      },
      weekStart,
      weekLabel: weekLabel(weekStart),
      min: CLASS_FILM_MIN,
      max: CLASS_FILM_MAX,
      children: children.map((child) => ({
        id: child.id,
        name: child.name,
        faceUrl: proxyUrl(child.photo_path),
        /** photos of this child that EXIST this week — drives "can be excused" */
        weekPhotoCount: week.byChild.get(child.id)?.length ?? 0,
      })),
      photos: week.photos.map((photo) => ({
        id: photo.id,
        url: proxyUrl(photo.storage_path),
        capturedAt: photo.captured_at,
        dayKey: dayKeyInZone(photo.captured_at, klass.tz),
        dayLabel: dayLabelInZone(photo.captured_at, klass.tz),
        childIds: week.tagsByPhoto.get(photo.id) ?? [],
      })),
      latestJob: liveJob
        ? {
            id: liveJob.id,
            status: liveJob.status,
            photoCount: (liveJob.media_ids as string[] | null)?.length ?? 0,
            excusedChildIds: (liveJob.excused_child_ids as string[] | null) ?? [],
          }
        : null,
    });
  } catch (error) {
    if (isSetupPending(error)) return NOT_MIGRATED();
    console.error('[potato/class-film GET] error:', error);
    return NextResponse.json({ error: 'Could not load the picker.' }, { status: 500 });
  }
}

// ------------------------------------------------------------------ POST ---

export async function POST(request: NextRequest) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const payload = (body ?? {}) as {
    weekStart?: unknown;
    mediaIds?: unknown;
    excusedChildIds?: unknown;
  };

  try {
    const supabase = potatoDb();
    const caps = await potatoCapabilities(supabase);
    if (!caps.jobs) return NOT_MIGRATED();

    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const weekStart = resolveWeekStart(payload.weekStart ?? null, klass.tz);
    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart must be YYYY-MM-DD' }, { status: 400 });
    }

    // Don't stack renders: a double tap while one is in flight returns the job
    // already running, exactly as the child-film route does.
    const { data: live, error: liveError } = await supabase
      .from('tp_montage_jobs')
      .select('id, status')
      .eq('class_id', session.classId)
      .eq('week_start', weekStart)
      .eq('kind', 'class')
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

    const [children, week] = await Promise.all([
      listChildren(supabase, session.classId),
      loadWeekPhotos(supabase, session.classId, weekStart, klass.tz),
    ]);

    const result = validateClassFilm({
      mediaIds: payload.mediaIds as string[],
      excusedChildIds: payload.excusedChildIds as string[],
      activeChildIds: children.map((c) => c.id),
      weekPhotoTags: week.tagsByPhoto,
    });

    if (!result.ok) {
      // Per-child detail, so the picker can light up exactly the chips that
      // need attention instead of showing a vague sentence.
      const nameOf = new Map(children.map((c) => [c.id, c.name]));
      return NextResponse.json(
        {
          error: result.errors[0]?.message ?? 'That film cannot be made yet.',
          errors: result.errors,
          missing: result.missing.map((id) => ({ id, name: nameOf.get(id) ?? 'A child' })),
          covered: result.covered,
          excused: result.excused,
        },
        { status: 400 },
      );
    }

    // Chronological — the order of the film. Sorted from captured_at held
    // server-side, never from the order the client happened to send.
    const capturedAt = new Map(week.photos.map((p) => [p.id, p.captured_at]));
    const orderedMediaIds = [...result.mediaIds].sort((a, b) =>
      (capturedAt.get(a) ?? '').localeCompare(capturedAt.get(b) ?? ''),
    );

    const { data: job, error } = await supabase
      .from('tp_montage_jobs')
      .insert({
        class_id: session.classId,
        child_id: null,
        kind: 'class',
        week_start: weekStart,
        status: 'queued',
        media_ids: orderedMediaIds,
        excused_child_ids: result.excused,
      })
      .select('id, status, week_start, created_at')
      .maybeSingle();
    if (error) throw error;
    if (!job) throw new Error('Class film job was not returned after insert');

    return NextResponse.json({
      ok: true,
      alreadyRunning: false,
      job: {
        id: job.id,
        status: job.status,
        weekStart: job.week_start,
        photoCount: orderedMediaIds.length,
        seconds: estimateSeconds(orderedMediaIds.length),
        inFilm: result.covered.length,
        excused: result.excused.length,
        createdAt: job.created_at,
      },
    });
  } catch (error) {
    if (isSetupPending(error)) return NOT_MIGRATED();
    console.error('[potato/class-film POST] error:', error);
    return NextResponse.json({ error: 'Could not start the class film.' }, { status: 500 });
  }
}
