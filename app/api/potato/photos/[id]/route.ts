// /api/potato/photos/[id]
//
//   DELETE — remove a bad shot. Teacher only, and only for a photo belonging to
//            her own class. The junction rows cascade; the storage object is
//            removed best-effort (an orphaned object costs pennies, a 500 costs
//            the teacher her afternoon).
//
//   PATCH  — v1.1: { childIds } replaces who is in the photo. Retagging happens
//            inside the lightbox rather than in a separate flow, so a teacher
//            who spots a miss while flipping through the week can fix it there.
//
//            v1.0.1 adds { sceneId }: a uuid moves the photo to that scene, an
//            EXPLICIT null clears it, and an absent field leaves it alone. The
//            three states are distinguished on purpose — `undefined` and
//            `null` mean opposite things here, so "clear the scene" can never
//            be confused with "don't touch the scene".
//
//            childIds is now OPTIONAL TOO, so the lightbox can change a scene
//            without resending the tag set (and vice versa). Old clients always
//            send childIds and take exactly the path they always did. A body
//            with neither field is a 400 — there is nothing to save.
//
//            🚨 A sceneId in the body when migration 335 has not run yet is a
//            503 setup_pending, NOT a silent no-op. Unlike the upload route —
//            where the photo is the point and the label is a bonus — this call
//            exists only to change the tagging, so pretending it worked would
//            be a lie the teacher discovers later.

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
  isSetupPending,
  POTATO_BUCKET,
  potatoCapabilities,
  loadOwnedScene,
} from '@/lib/potato/db';

export const dynamic = 'force-dynamic';

/** Standalone-app preflight. A no-op for the website, which never preflights. */
export const OPTIONS = potatoOptionsHandler;

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  // withPotatoCors is a no-op unless the caller is an allow-listed app origin,
  // so the website's response is byte-identical to before.
  return withPotatoCors(await handleDELETE(request, ctx), request);
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await resolvePotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid photo id' }, { status: 400 });
  }

  try {
    const supabase = potatoDb();

    // 🚨 Deactivating a class is the only revocation lever for a 10-year
    // teacher cookie — re-check it here too, not just on the routes that
    // happen to load the class for other reasons.
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // 🚨 Ownership before deletion: the class comes from the cookie, never the
    // request, and the row must match both.
    const { data: photo, error: findError } = await supabase
      .from('tp_photos')
      .select('id, storage_path, class_id')
      .eq('id', id)
      .eq('class_id', session.classId)
      .maybeSingle();
    if (findError) throw findError;
    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

    const { error: deleteError } = await supabase
      .from('tp_photos')
      .delete()
      .eq('id', photo.id)
      .eq('class_id', session.classId);
    if (deleteError) throw deleteError;

    if (photo.storage_path) {
      const { error: removeError } = await supabase.storage
        .from(POTATO_BUCKET)
        .remove([photo.storage_path]);
      if (removeError) {
        console.error('[potato/photos/delete] storage remove failed (row already gone):', removeError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/photos/delete] error:', error);
    return NextResponse.json({ error: 'Could not delete that photo.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
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
    return NextResponse.json({ error: 'Invalid photo id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const payload = (body ?? {}) as { childIds?: unknown; sceneId?: unknown };

  // ---- childIds: unchanged rules, now optional -----------------------------
  const wantsChildIds = payload.childIds !== undefined;
  let childIds: string[] = [];
  if (wantsChildIds) {
    if (!Array.isArray(payload.childIds)) {
      return NextResponse.json({ error: 'childIds must be an array' }, { status: 400 });
    }
    childIds = Array.from(
      new Set(
        payload.childIds.filter((v): v is string => typeof v === 'string' && UUID_RE.test(v)),
      ),
    );
    if (childIds.length === 0) {
      return NextResponse.json({ error: 'Tap at least one child.' }, { status: 400 });
    }
  }

  // ---- sceneId: absent / null / uuid, three distinct meanings --------------
  const wantsScene = payload.sceneId !== undefined;
  let sceneIdWanted: string | null = null;
  if (wantsScene) {
    if (payload.sceneId === null) {
      sceneIdWanted = null;
    } else if (typeof payload.sceneId === 'string' && UUID_RE.test(payload.sceneId)) {
      sceneIdWanted = payload.sceneId;
    } else {
      return NextResponse.json({ error: 'Invalid sceneId' }, { status: 400 });
    }
  }

  if (!wantsChildIds && !wantsScene) {
    return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });
  }

  try {
    const supabase = potatoDb();
    const caps = await potatoCapabilities(supabase);
    if (wantsScene && !caps.scenes) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }

    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // 🚨 Ownership on the photo AND on every child named — the same two checks
    // the upload route makes. The class comes from the cookie, never the body.
    // Typed as `string` so supabase-js does not try to parse a runtime select
    // list at compile time (see the same note in photos/upload).
    const photoColumns: string = caps.scenes ? 'id, scene_id' : 'id';
    const { data: photoRaw, error: findError } = await supabase
      .from('tp_photos')
      .select(photoColumns)
      .eq('id', id)
      .eq('class_id', session.classId)
      .maybeSingle();
    if (findError) throw findError;
    const photo = photoRaw as { id: string; scene_id?: string | null } | null;
    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

    // 🚨 The scene must be one of HER class's, checked exactly like the child
    // ids below. A HIDDEN scene is allowed here, deliberately: this is the
    // repair flow, and putting a photo back where it belongs must not be
    // blocked because the teacher has since retired that chip. (The capture
    // route is the opposite — you cannot tag a NEW shot with a hidden scene.)
    let sceneName: string | null = null;
    if (wantsScene && sceneIdWanted) {
      const scene = await loadOwnedScene(supabase, session.classId, sceneIdWanted);
      if (!scene) return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
      sceneName = scene.name;
    }

    if (wantsChildIds) {
      const { data: owned, error: ownedError } = await supabase
        .from('tp_children')
        .select('id')
        .eq('class_id', session.classId)
        .eq('is_active', true)
        .in('id', childIds);
      if (ownedError) throw ownedError;
      const ownedIds = ((owned ?? []) as { id: string }[]).map((row) => row.id);
      if (ownedIds.length !== childIds.length) {
        return NextResponse.json(
          { error: 'One of those children isn’t in this class.' },
          { status: 403 },
        );
      }

      // Replace the tag set. Delete-then-insert rather than a diff: the set is
      // at most a class-worth of rows, and a partial diff that half-applies
      // would leave a photo counting for the wrong children.
      const { error: clearError } = await supabase
        .from('tp_photo_children')
        .delete()
        .eq('photo_id', photo.id);
      if (clearError) throw clearError;

      const { error: insertError } = await supabase
        .from('tp_photo_children')
        .insert(ownedIds.map((childId) => ({ photo_id: photo.id, child_id: childId })));
      if (insertError) throw insertError;

      childIds = ownedIds;
    } else {
      // Not being changed — read it back so the response is always the whole
      // truth about the photo, whichever field the client sent.
      const { data: tags, error: tagsError } = await supabase
        .from('tp_photo_children')
        .select('child_id')
        .eq('photo_id', photo.id);
      if (tagsError) throw tagsError;
      childIds = ((tags ?? []) as { child_id: string }[]).map((row) => row.child_id);
    }

    let sceneId: string | null = caps.scenes ? photo.scene_id ?? null : null;
    if (wantsScene) {
      const { error: sceneError } = await supabase
        .from('tp_photos')
        .update({ scene_id: sceneIdWanted })
        .eq('id', photo.id)
        // the class filter is repeated on the UPDATE so a race cannot widen
        // the blast radius — the same rule as /children PATCH.
        .eq('class_id', session.classId);
      if (sceneError) throw sceneError;
      sceneId = sceneIdWanted;
    } else if (sceneId) {
      const current = await loadOwnedScene(supabase, session.classId, sceneId);
      sceneName = current?.name ?? null;
    }

    return NextResponse.json({
      ok: true,
      photo: { id: photo.id, childIds, sceneId, sceneName },
    });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/photos/patch] error:', error);
    return NextResponse.json({ error: 'Could not save those tags.' }, { status: 500 });
  }
}
