// PATCH /api/potato/scenes/[id] — rename a scene, or hide it.
//
//   { name?, isActive? } → { ok: true, scene }
//
// 🚨 HIDE, NEVER DELETE. There is no DELETE on this route on purpose. A scene
// that has been used is part of the history of a term: photos point at it, and
// "Music class" disappearing from March's shots because somebody tidied up in
// September is a loss the teacher can never undo. isActive=false takes the
// chip off the capture screen and leaves every photo exactly where it is. If a
// DELETE is ever added, it must be a class-scoped soft delete, not a row
// deletion — the FK is ON DELETE SET NULL, which would quietly unlabel history.
//
// Ownership is checked against the class in the session, never the request —
// the same rule as /photos/[id] and /children.

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
  loadOwnedScene,
  findActiveSceneByName,
  scenePhotoCounts,
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

function sceneJson(scene: PotatoScene, photoCount: number) {
  return {
    id: scene.id,
    name: scene.name,
    isActive: scene.is_active !== false,
    photoCount,
  };
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  // withPotatoCors is a no-op unless the caller is an allow-listed app origin,
  // so the website's response is byte-identical to before.
  return withPotatoCors(await handlePATCH(request, ctx), request);
}

async function handlePATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await resolvePotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid scene id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const payload = (body ?? {}) as { name?: unknown; isActive?: unknown };

  const patch: Record<string, unknown> = {};
  let nextName: string | null = null;
  if (payload.name !== undefined) {
    const name = cleanSceneName(payload.name);
    if (!name) return NextResponse.json({ error: 'A scene name is needed.' }, { status: 400 });
    if (name.length > SCENE_NAME_MAX) {
      return NextResponse.json(
        { error: `Keep it under ${SCENE_NAME_MAX} characters.` },
        { status: 400 },
      );
    }
    patch.name = name;
    nextName = name;
  }
  if (payload.isActive !== undefined) {
    if (typeof payload.isActive !== 'boolean') {
      return NextResponse.json({ error: 'Invalid isActive' }, { status: 400 });
    }
    patch.is_active = payload.isActive;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });
  }

  try {
    const supabase = potatoDb();
    const caps = await potatoCapabilities(supabase);
    if (!caps.scenes) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }

    // 🚨 A class deactivated by HQ must lose its session on every route.
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // Existence is never ownership: this reads the row INSIDE the caller's
    // class, and the UPDATE below repeats the class filter so a race cannot
    // widen the blast radius.
    const existing = await loadOwnedScene(supabase, session.classId, id);
    if (!existing) return NextResponse.json({ error: 'Scene not found' }, { status: 404 });

    // A rename only clashes with the OTHER live scenes, and only when the row
    // will still be live afterwards — un-hiding into a taken name is the same
    // collision and gets the same 409.
    const willBeActive =
      patch.is_active === undefined ? existing.is_active !== false : patch.is_active === true;
    const checkName = nextName ?? existing.name;
    if (willBeActive) {
      const clash = await findActiveSceneByName(supabase, session.classId, checkName, existing.id);
      if (clash) {
        return NextResponse.json(
          { error: 'You already have a scene with that name.', scene: sceneJson(clash, 0) },
          { status: 409 },
        );
      }
    }

    const { data: scene, error } = await supabase
      .from('tp_scenes')
      .update(patch)
      .eq('id', id)
      .eq('class_id', session.classId)
      .select('id, class_id, name, is_active, created_at')
      .maybeSingle();
    if (error) {
      // uq_tp_scenes_class_name_active lost the race — same answer as above.
      if (errorCode(error) === '23505') {
        return NextResponse.json(
          { error: 'You already have a scene with that name.' },
          { status: 409 },
        );
      }
      throw error;
    }
    if (!scene) return NextResponse.json({ error: 'Scene not found' }, { status: 404 });

    // Counts come back on every scene shape so the Scenes screen can re-render
    // from one response — hiding a scene must visibly keep its photos.
    const counts = await scenePhotoCounts(supabase, session.classId, [id]);

    return NextResponse.json({
      ok: true,
      scene: sceneJson(scene as PotatoScene, counts.get(id) ?? 0),
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/scenes PATCH] error:', error);
    return NextResponse.json({ error: 'Could not save that change.' }, { status: 500 });
  }
}
