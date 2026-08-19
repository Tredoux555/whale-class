// GET /api/potato/photos?childId=…&week=YYYY-MM-DD — the review strip.
//
// Teacher only. Lists one child's photos for a week so bad shots can be deleted
// before the film is made (deleting IS the curation — there is no AI here).
//
// v1.1 adds what the full-screen lightbox needs: the day each shot belongs to
// (in the CLASS timezone), who is tagged in it, and the class roster so a tag
// can be fixed without a second round trip.

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
  listChildren,
  loadWeekPhotos,
  isSetupPending,
  proxyUrl,
  MONTAGE_THRESHOLD,
} from '@/lib/potato/db';
import { resolveWeekStart, weekLabel, dayLabelInZone } from '@/lib/potato/week';

export const dynamic = 'force-dynamic';

/** Standalone-app preflight. A no-op for the website, which never preflights. */
export const OPTIONS = potatoOptionsHandler;

export async function GET(request: NextRequest) {
  // withPotatoCors is a no-op unless the caller is an allow-listed app origin,
  // so the website's response is byte-identical to before.
  return withPotatoCors(await handleGET(request), request);
}

async function handleGET(request: NextRequest) {
  const session = await resolvePotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const childId = params.get('childId');
  if (!childId || !UUID_RE.test(childId)) {
    return NextResponse.json({ error: 'childId is required' }, { status: 400 });
  }

  try {
    const supabase = potatoDb();
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const child = await loadOwnedChild(supabase, session.classId, childId);
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

    const weekStart = resolveWeekStart(params.get('week'), klass.tz);
    if (!weekStart) {
      return NextResponse.json({ error: 'week must be YYYY-MM-DD' }, { status: 400 });
    }

    const [roster, week] = await Promise.all([
      listChildren(supabase, session.classId),
      loadWeekPhotos(supabase, session.classId, weekStart, klass.tz),
    ]);
    const mine = week.byChild.get(child.id) ?? [];

    return NextResponse.json({
      ok: true,
      child: { id: child.id, name: child.name, faceUrl: proxyUrl(child.photo_path) },
      weekStart,
      weekLabel: weekLabel(weekStart),
      threshold: MONTAGE_THRESHOLD,
      // The whole roster, so the lightbox can offer a tag fix in place.
      children: roster.map((c) => ({
        id: c.id,
        name: c.name,
        faceUrl: proxyUrl(c.photo_path),
      })),
      photos: mine.map((photo) => ({
        id: photo.id,
        url: proxyUrl(photo.storage_path),
        capturedAt: photo.captured_at,
        dayLabel: dayLabelInZone(photo.captured_at, klass.tz),
        childIds: week.tagsByPhoto.get(photo.id) ?? [],
      })),
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/photos] error:', error);
    return NextResponse.json({ error: 'Could not load those photos.' }, { status: 500 });
  }
}
