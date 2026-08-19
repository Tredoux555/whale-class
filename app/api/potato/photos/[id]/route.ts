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

import { NextRequest, NextResponse } from 'next/server';
import { UUID_RE } from '@/lib/potato/auth';
import {
  resolvePotatoTeacher,
  withPotatoCors,
  potatoOptionsHandler,
} from '@/lib/potato/app-auth';
import { potatoDb, loadClass, isSetupPending, POTATO_BUCKET } from '@/lib/potato/db';

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
  const raw = (body as { childIds?: unknown } | null)?.childIds;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: 'childIds must be an array' }, { status: 400 });
  }
  const childIds = Array.from(
    new Set(raw.filter((v): v is string => typeof v === 'string' && UUID_RE.test(v))),
  );
  if (childIds.length === 0) {
    return NextResponse.json({ error: 'Tap at least one child.' }, { status: 400 });
  }

  try {
    const supabase = potatoDb();

    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // 🚨 Ownership on the photo AND on every child named — the same two checks
    // the upload route makes. The class comes from the cookie, never the body.
    const { data: photo, error: findError } = await supabase
      .from('tp_photos')
      .select('id')
      .eq('id', id)
      .eq('class_id', session.classId)
      .maybeSingle();
    if (findError) throw findError;
    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

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

    // Replace the tag set. Delete-then-insert rather than a diff: the set is at
    // most a class-worth of rows, and a partial diff that half-applies would
    // leave a photo counting for the wrong children.
    const { error: clearError } = await supabase
      .from('tp_photo_children')
      .delete()
      .eq('photo_id', photo.id);
    if (clearError) throw clearError;

    const { error: insertError } = await supabase
      .from('tp_photo_children')
      .insert(ownedIds.map((childId) => ({ photo_id: photo.id, child_id: childId })));
    if (insertError) throw insertError;

    return NextResponse.json({ ok: true, photo: { id: photo.id, childIds: ownedIds } });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/photos/patch] error:', error);
    return NextResponse.json({ error: 'Could not save those tags.' }, { status: 500 });
  }
}
