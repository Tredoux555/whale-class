// /api/potato/scenes — the class's activity labels.
//
//   GET          → every LIVE scene in the teacher's class, with photo counts.
//                  ?all=1 includes hidden ones (the Scenes admin screen).
//   POST { name} → 201 with the new scene.
//
// A SCENE is what the class was doing — "Outdoor time", "Music class". A photo
// carries at most one; the children in that photo are the children who were
// there. There is deliberately no attendance table (migration 335 explains
// why), so this whole feature is one small table and one nullable column.
//
// Every query is scoped to the class in the session. The client never names a
// class — the same rule as /children and /photos.
//
// 🚨 SETUP_PENDING, NOT A DEGRADE. Unlike the upload route (which saves the
// photo unlabelled when migration 335 has not run yet), these routes have
// nothing honest to fall back to: an empty scene list would look like "you
// have no scenes" and a create would look like it worked. So when the `scenes`
// capability is false they return 503 setup_pending, which the app already
// knows how to show.

import { NextRequest, NextResponse } from 'next/server';
import {
  resolvePotatoTeacher,
  withPotatoCors,
  potatoOptionsHandler,
} from '@/lib/potato/app-auth';
import {
  potatoDb,
  loadClass,
  listScenes,
  scenePhotoCounts,
  findActiveSceneByName,
  cleanSceneName,
  potatoCapabilities,
  isSetupPending,
  errorCode,
  SCENE_NAME_MAX,
  type PotatoScene,
} from '@/lib/potato/db';

export const dynamic = 'force-dynamic';

/** Standalone-app preflight. A no-op for the website, which never preflights. */
export const OPTIONS = potatoOptionsHandler;

/** The one wire shape for a scene. Every scenes endpoint returns exactly this. */
function sceneJson(scene: PotatoScene, photoCount: number) {
  return {
    id: scene.id,
    name: scene.name,
    isActive: scene.is_active !== false,
    photoCount,
  };
}

export async function GET(request: NextRequest) {
  // withPotatoCors is a no-op unless the caller is an allow-listed app origin,
  // so the website's response is byte-identical to before.
  return withPotatoCors(await handleGET(request), request);
}

async function handleGET(request: NextRequest) {
  const session = await resolvePotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const includeHidden = new URL(request.url).searchParams.get('all') === '1';

  try {
    const supabase = potatoDb();
    const caps = await potatoCapabilities(supabase);
    if (!caps.scenes) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }

    // 🚨 Deactivating a class is the only revocation lever for a 10-year
    // teacher cookie — re-check it on every route, not just the mutating ones.
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    const scenes = await listScenes(supabase, session.classId, includeHidden);
    const counts = await scenePhotoCounts(
      supabase,
      session.classId,
      scenes.map((scene) => scene.id),
    );

    return NextResponse.json({
      ok: true,
      scenes: scenes.map((scene) => sceneJson(scene, counts.get(scene.id) ?? 0)),
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/scenes GET] error:', error);
    return NextResponse.json({ error: 'Could not load the scenes.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

  // Trim first, then measure: "  " is not a name, and a name is not allowed to
  // be silently truncated into a different scene than the one she typed.
  const name = cleanSceneName((body as { name?: unknown } | null)?.name);
  if (!name) return NextResponse.json({ error: 'A scene name is needed.' }, { status: 400 });
  if (name.length > SCENE_NAME_MAX) {
    return NextResponse.json(
      { error: `Keep it under ${SCENE_NAME_MAX} characters.` },
      { status: 400 },
    );
  }

  try {
    const supabase = potatoDb();
    const caps = await potatoCapabilities(supabase);
    if (!caps.scenes) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }

    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // The friendly duplicate check. The unique index below is the real one.
    const clash = await findActiveSceneByName(supabase, session.classId, name);
    if (clash) {
      return NextResponse.json(
        { error: 'You already have a scene with that name.', scene: sceneJson(clash, 0) },
        { status: 409 },
      );
    }

    const { data: scene, error } = await supabase
      .from('tp_scenes')
      .insert({ class_id: session.classId, name })
      .select('id, class_id, name, is_active, created_at')
      .maybeSingle();
    if (error) {
      // 🚨 The check above is not atomic: two teachers on one class login can
      // both miss it and both reach this INSERT. uq_tp_scenes_class_name_active
      // turns the loser into a 23505, which is the SAME answer as the friendly
      // check — one scene, one 409 — instead of two chips with one name.
      if (errorCode(error) === '23505') {
        const winner = await findActiveSceneByName(supabase, session.classId, name);
        return NextResponse.json(
          {
            error: 'You already have a scene with that name.',
            scene: winner ? sceneJson(winner, 0) : undefined,
          },
          { status: 409 },
        );
      }
      throw error;
    }
    if (!scene) throw new Error('Scene row was not returned after insert');

    // A brand-new scene has no photos yet — no need to ask the database.
    return NextResponse.json(
      { ok: true, scene: sceneJson(scene as PotatoScene, 0) },
      { status: 201 },
    );
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/scenes POST] error:', error);
    return NextResponse.json({ error: 'Could not add that scene.' }, { status: 500 });
  }
}
