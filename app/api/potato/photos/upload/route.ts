// POST /api/potato/photos/upload — a photo plus the children in it.
//
// multipart/form-data:
//   file      — the image (≤10MB, jpeg/png/webp/heic)
//   childIds  — JSON array of tp_children ids, at least one
//
// A photo with no children tagged counts for nobody and can never reach a
// montage, so it is rejected rather than silently stored.

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyPotatoTeacher, UUID_RE } from '@/lib/potato/auth';
import { potatoDb, loadClass, isSetupPending, proxyUrl, POTATO_BUCKET } from '@/lib/potato/db';
import { storageDateFolders } from '@/lib/potato/week';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export async function POST(request: NextRequest) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No photo was attached.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'That photo is too big (10MB max).' }, { status: 413 });
  }

  const mime = (file.type || '').toLowerCase();
  const ext = EXT_BY_MIME[mime];
  if (!ext) {
    return NextResponse.json({ error: 'That file type isn’t a photo we can use.' }, { status: 415 });
  }

  let childIds: string[];
  try {
    const raw = form.get('childIds');
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) throw new Error('childIds must be an array');
    childIds = Array.from(
      new Set(parsed.filter((id): id is string => typeof id === 'string' && UUID_RE.test(id))),
    );
  } catch {
    return NextResponse.json({ error: 'Invalid childIds' }, { status: 400 });
  }
  if (childIds.length === 0) {
    return NextResponse.json({ error: 'Tap at least one child before saving.' }, { status: 400 });
  }

  const supabase = potatoDb();
  let storagePath: string | null = null;
  let photoId: string | null = null;

  try {
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // 🚨 Class ownership on every tagged child. Existence is not ownership.
    const { data: owned, error: ownedError } = await supabase
      .from('tp_children')
      .select('id')
      .eq('class_id', session.classId)
      .eq('is_active', true)
      .in('id', childIds);
    if (ownedError) throw ownedError;
    const ownedIds = ((owned ?? []) as { id: string }[]).map((row) => row.id);
    if (ownedIds.length !== childIds.length) {
      return NextResponse.json({ error: 'One of those children isn’t in this class.' }, { status: 403 });
    }

    const capturedAt = new Date();
    const { yyyy, mm } = storageDateFolders(klass.tz, capturedAt);
    storagePath = `class/${session.classId}/photos/${yyyy}/${mm}/${randomUUID()}.${ext}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(POTATO_BUCKET)
      .upload(storagePath, bytes, { contentType: mime, upsert: false });
    if (uploadError) throw uploadError;

    const { data: photo, error: insertError } = await supabase
      .from('tp_photos')
      .insert({
        class_id: session.classId,
        storage_path: storagePath,
        captured_at: capturedAt.toISOString(),
      })
      .select('id, storage_path, captured_at')
      .maybeSingle();
    if (insertError) throw insertError;
    if (!photo) throw new Error('Photo row was not returned after insert');
    photoId = photo.id;

    const { error: tagError } = await supabase
      .from('tp_photo_children')
      .insert(ownedIds.map((childId) => ({ photo_id: photo.id, child_id: childId })));
    if (tagError) throw tagError;

    return NextResponse.json({
      ok: true,
      photo: {
        id: photo.id,
        url: proxyUrl(photo.storage_path),
        capturedAt: photo.captured_at,
        childIds: ownedIds,
      },
    });
  } catch (error) {
    // An untagged photo is invisible to the board and to every montage, so a
    // half-written upload is rolled back rather than left as a ghost.
    if (photoId) {
      await supabase.from('tp_photos').delete().eq('id', photoId).then(
        ({ error: cleanupError }: { error: unknown }) => {
          if (cleanupError) console.error('[potato/photos/upload] row cleanup failed:', cleanupError);
        },
        (err: unknown) => console.error('[potato/photos/upload] row cleanup threw:', err),
      );
    }
    if (storagePath) {
      await supabase.storage.from(POTATO_BUCKET).remove([storagePath]).then(
        ({ error: cleanupError }: { error: unknown }) => {
          if (cleanupError) console.error('[potato/photos/upload] object cleanup failed:', cleanupError);
        },
        (err: unknown) => console.error('[potato/photos/upload] object cleanup threw:', err),
      );
    }
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/photos/upload] error:', error);
    return NextResponse.json({ error: 'That photo didn’t save. Try again.' }, { status: 500 });
  }
}
