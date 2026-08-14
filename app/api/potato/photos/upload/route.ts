// POST /api/potato/photos/upload — a photo plus the children in it.
//
// multipart/form-data:
//   file        — the image (≤10MB, jpeg/png/webp/heic)
//   childIds    — JSON array of tp_children ids, at least one
//   capturedAt  — OPTIONAL ISO instant: when the shutter actually fired
//   clientId    — OPTIONAL uuid from the device queue, stable across retries
//
// A photo with no children tagged counts for nobody and can never reach a
// film, so it is rejected rather than silently stored.
//
// 🚨 WHY capturedAt EXISTS (v1.2, offline capture)
// Photos are written to the device first and uploaded whenever the network
// allows. A shot taken on Friday afternoon in a dead spot may arrive on Monday
// morning. If the server stamped NOW, that photo would land in the wrong week —
// it would vanish from Friday's board, corrupt the WYSIWYG counts the teacher
// curated against, and quietly change what a film contains. So the client's
// shutter time is trusted, inside limits it cannot abuse:
//   • must parse
//   • must not be in the future beyond a small clock-skew allowance
//   • must not be older than 30 days
// A value that fails any of those is IGNORED (falls back to now) and the
// response says so in `capturedAtNote`, rather than failing the upload — a
// photo with a bad timestamp is still a photo worth keeping.
//
// 🚨 WHY clientId EXISTS
// If the server commits and the response is lost, the device retries. Deriving
// the storage object name from the client's stable id makes that retry
// recognisable: the same path means the same capture, so we return the row we
// already have instead of inserting a duplicate.

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyPotatoTeacher, UUID_RE } from '@/lib/potato/auth';
import {
  potatoDb,
  loadClass,
  isSetupPending,
  proxyUrl,
  POTATO_BUCKET,
  potatoCapabilities,
} from '@/lib/potato/db';
import { storageDateFolders } from '@/lib/potato/week';
import { resolveCapturedAt } from '@/lib/potato/captured-at';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;

/** Whatever the client sends becomes part of a storage path — keep it boring. */
const CLIENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{7,63}$/;

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

  // ---- capturedAt: trusted within limits (see lib/potato/captured-at.ts) ----
  const { capturedAt, note: capturedAtNote } = resolveCapturedAt(form.get('capturedAt'));

  // ---- clientId: stable across retries, so a retry is idempotent -----------
  const rawClientId = form.get('clientId');
  const clientId =
    typeof rawClientId === 'string' && CLIENT_ID_RE.test(rawClientId) ? rawClientId : null;

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

    // Folders follow the CLASS calendar at the moment of CAPTURE, so a Friday
    // photo uploaded on Monday still files under Friday's month.
    const { yyyy, mm } = storageDateFolders(klass.tz, capturedAt);
    const objectName = clientId ?? randomUUID();
    storagePath = `class/${session.classId}/photos/${yyyy}/${mm}/${objectName}.${ext}`;

    // Idempotency: if this exact capture already landed, the retry is a no-op.
    if (clientId) {
      const { data: already, error: alreadyError } = await supabase
        .from('tp_photos')
        .select('id, storage_path, captured_at')
        .eq('class_id', session.classId)
        .eq('storage_path', storagePath)
        .maybeSingle();
      if (alreadyError) throw alreadyError;
      if (already) {
        return NextResponse.json({
          ok: true,
          duplicate: true,
          photo: {
            id: already.id,
            url: proxyUrl(already.storage_path),
            capturedAt: already.captured_at,
            childIds: ownedIds,
          },
        });
      }
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(POTATO_BUCKET)
      // upsert so a retry whose row never landed can rewrite its own object
      // instead of colliding with the orphan its last attempt left behind.
      .upload(storagePath, bytes, { contentType: mime, upsert: true });
    if (uploadError) throw uploadError;

    // v1.4: stamp who took it — feature-detected, so an upload before
    // migration 333 is pasted still saves the photo, just without a name.
    const caps = await potatoCapabilities(supabase);
    const insertRow: Record<string, unknown> = {
      class_id: session.classId,
      storage_path: storagePath,
      captured_at: capturedAt.toISOString(),
    };
    if (caps.attribution && session.staffName) insertRow.uploaded_by = session.staffName;

    const { data: photo, error: insertError } = await supabase
      .from('tp_photos')
      .insert(insertRow)
      .select('id, storage_path, captured_at')
      .maybeSingle();
    if (insertError) {
      // 🚨 AUDIT FIX (v1.2, HIGH): the SELECT-then-INSERT idempotency check
      // above is not atomic — two concurrent requests for the same clientId
      // (two tabs/devices on one class login, or a retry racing the request
      // it is retrying) can both miss the earlier SELECT and both reach this
      // INSERT. A unique index on storage_path (migration 320) turns the
      // loser's insert into a 23505 instead of a silent duplicate row — the
      // same pattern already used for tp_parent_codes elsewhere in this
      // codebase. The loser reads back the winner's row and returns it as a
      // duplicate, exactly like the pre-check above, instead of double-tagging
      // the photo and inflating the child's weekly count.
      if ((insertError as { code?: string }).code === '23505') {
        const conflictingPath = storagePath;
        // The unique index proves SOME row already owns this storage_path —
        // never let the generic catch below delete that object out from under
        // whichever request actually won the race.
        storagePath = null;
        const { data: winner, error: winnerError } = await supabase
          .from('tp_photos')
          .select('id, storage_path, captured_at')
          .eq('class_id', session.classId)
          .eq('storage_path', conflictingPath)
          .maybeSingle();
        if (winnerError) throw winnerError;
        if (winner) {
          return NextResponse.json({
            ok: true,
            duplicate: true,
            capturedAtNote,
            photo: {
              id: winner.id,
              url: proxyUrl(winner.storage_path),
              capturedAt: winner.captured_at,
              childIds: ownedIds,
            },
          });
        }
      }
      throw insertError;
    }
    if (!photo) throw new Error('Photo row was not returned after insert');
    photoId = photo.id;

    const { error: tagError } = await supabase
      .from('tp_photo_children')
      .insert(ownedIds.map((childId) => ({ photo_id: photo.id, child_id: childId })));
    if (tagError) throw tagError;

    return NextResponse.json({
      ok: true,
      duplicate: false,
      // Non-null when the client's shutter time was refused and now() was used
      // instead — the anomaly is reported, never silently swallowed.
      capturedAtNote,
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
