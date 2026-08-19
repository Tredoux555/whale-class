// GET /api/potato/photos?childId=…&week=YYYY-MM-DD — the review strip.
//
// Teacher only. Lists one child's photos for a week so bad shots can be deleted
// before the film is made (deleting IS the curation — there is no AI here).
//
// v1.1 adds what the full-screen lightbox needs: the day each shot belongs to
// (in the CLASS timezone), who is tagged in it, and the class roster so a tag
// can be fixed without a second round trip.
//
// v1.0.1 adds scenes. Every photo gains `sceneId` + `sceneName` (both null when
// unlabelled), `?sceneId=` filters the strip down to one activity, and the
// class's scene list rides along in the response for the same reason the roster
// does: the review screen draws its filter chips and its retag menu without a
// second round trip.
//
// 🚨 The scene join is FEATURE-DETECTED (lib/potato/db.ts `scenes`). Before
// migration 335 lands, every photo simply reports sceneId/sceneName null and
// `scenes: []` — the strip, the counts and the lightbox are byte-for-byte v1.4.
// A `?sceneId=` filter in that window returns an empty list, which is the
// truthful answer: nothing is tagged yet, so nothing matches.

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
  potatoCapabilities,
  listScenes,
  scenesForPhotos,
  type PotatoScene,
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

  // Optional. An empty value means "no filter", so a client that always sends
  // the parameter behaves the same as one that omits it.
  const rawSceneId = params.get('sceneId');
  const sceneFilter = rawSceneId && rawSceneId.trim() !== '' ? rawSceneId.trim() : null;
  if (sceneFilter && !UUID_RE.test(sceneFilter)) {
    return NextResponse.json({ error: 'Invalid sceneId' }, { status: 400 });
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

    const caps = await potatoCapabilities(supabase);

    const [roster, week] = await Promise.all([
      listChildren(supabase, session.classId),
      loadWeekPhotos(supabase, session.classId, weekStart, klass.tz),
    ]);
    const allMine = week.byChild.get(child.id) ?? [];

    // One extra query rather than an embedded join — the same choice
    // loadWeekPhotos makes, and for the same reason (see lib/potato/db.ts).
    // HIDDEN scenes are included on purpose: a photo taken during a scene the
    // teacher has since hidden must still show the label it was taken under.
    const scenes: PotatoScene[] = caps.scenes
      ? await listScenes(supabase, session.classId, true)
      : [];
    const sceneNameById = new Map(scenes.map((scene) => [scene.id, scene.name]));
    const sceneByPhoto = caps.scenes
      ? await scenesForPhotos(supabase, session.classId, allMine.map((photo) => photo.id))
      : new Map<string, string | null>();

    const mine = sceneFilter
      ? allMine.filter((photo) => (sceneByPhoto.get(photo.id) ?? null) === sceneFilter)
      : allMine;

    return NextResponse.json({
      ok: true,
      child: { id: child.id, name: child.name, faceUrl: proxyUrl(child.photo_path) },
      weekStart,
      weekLabel: weekLabel(weekStart),
      threshold: MONTAGE_THRESHOLD,
      // Echoed back so the client can keep its chip row in sync with what the
      // server actually filtered on.
      sceneId: sceneFilter,
      // Every scene in the class, hidden ones included and flagged — the
      // review screen shows live scenes as filter chips and still has the name
      // it needs for a photo tagged with a hidden one.
      scenes: scenes.map((scene) => ({
        id: scene.id,
        name: scene.name,
        isActive: scene.is_active !== false,
      })),
      // The whole roster, so the lightbox can offer a tag fix in place.
      children: roster.map((c) => ({
        id: c.id,
        name: c.name,
        faceUrl: proxyUrl(c.photo_path),
      })),
      photos: mine.map((photo) => {
        const sceneId = sceneByPhoto.get(photo.id) ?? null;
        return {
          id: photo.id,
          url: proxyUrl(photo.storage_path),
          capturedAt: photo.captured_at,
          dayLabel: dayLabelInZone(photo.captured_at, klass.tz),
          childIds: week.tagsByPhoto.get(photo.id) ?? [],
          sceneId,
          // null-safe both ways: an untagged photo, and a tagged photo whose
          // scene row has somehow gone (ON DELETE SET NULL makes that a
          // near-impossibility, but a name is not worth a 500).
          sceneName: sceneId ? sceneNameById.get(sceneId) ?? null : null,
        };
      }),
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/photos] error:', error);
    return NextResponse.json({ error: 'Could not load those photos.' }, { status: 500 });
  }
}
