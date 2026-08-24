// POST /api/potato/photos/upload — a photo OR a video, plus the children in it.
//
// multipart/form-data:
//   file            — the image (≤10MB, jpeg/png/webp/heic) or the video
//                     (≤200MB, mp4/mov/webm/3gp) — see the caps below
//   childIds        — JSON array of tp_children ids, at least one
//   capturedAt      — OPTIONAL ISO instant: when the shutter actually fired
//   clientId        — OPTIONAL uuid from the device queue, stable across retries
//   sceneId         — OPTIONAL tp_scenes uuid: what the class was doing (v1.0.1)
//   group           — OPTIONAL '1': a whole-room capture, tagged with nobody
//   durationSeconds — OPTIONAL, video only: the length the client measured (v1.6)
//
// 🚨 WHY VIDEO COMES THROUGH THIS ROUTE AND NOT A NEW ONE (v1.6)
// Everything below the file itself is identical for a video: the same class
// ownership on every tagged child, the same scene validation, the same
// capturedAt window, the same clientId idempotency, the same storage path
// grammar, the same rollback on a half-written upload. A second endpoint would
// be a second copy of all of it, drifting apart one audit fix at a time — and
// the offline queue would need to know which door to knock on, which is a
// decision it has no business making. So the file's MIME decides the CAPS
// (10MB photo / 200MB + 3min video) and nothing else changes shape.
//
// 🚨 WHY THE DURATION GUARD TRUSTS THE CLIENT AND STILL CHECKS IT
// There is no ffprobe in this pipeline and there will not be one: transcoding
// a teacher's video on a Next.js route is a different product. The client
// reads the picked file's `loadedmetadata` duration and refuses anything over
// three minutes before it ever queues. This check is the second wall — a hand-
// rolled request, an old bundle, or a metadata read that lied cannot get a
// twenty-minute assembly into the bucket. It is paired with a HARD byte cap,
// which is the guard that does not depend on the client's honesty at all.
//
// A photo with no children tagged counts for nobody and can never reach a
// child's film, so it is rejected rather than silently stored — UNLESS the
// client says `group=1`.
//
// 🚨 WHY `group` IS A FIELD AND NOT JUST "childIds was empty"
// An empty childIds is almost always a slip of the thumb: she framed the shot,
// forgot to tap a face, and hit Save. That photo would vanish from every bar on
// the board and from every child film, so the 400 above exists to catch it and
// has to stay. But a GROUP photo — the whole room at the water table — is a
// real thing a teacher wants to keep, and it belongs in the class film even
// though it belongs to no single child. So zero children is legal exactly when
// the request says so on purpose. A group photo writes NO tp_photo_children
// rows at all: it is the absence of those rows that makes it group-only, which
// is why this needed no migration. loadWeekPhotos reads tp_photos directly, so
// the class-film picker still sees it; the per-child strips correctly do not.
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
//
// 🚨 WHY sceneId IS OPTIONAL, AND WHY A BAD ONE IS NOT FATAL-BY-DEFAULT
// The scene is a label; the photograph is the thing. An absent field means the
// teacher did not pick a scene (old clients never send it at all — they are
// untouched). A field that IS sent gets validated properly: it must be a uuid,
// it must be a scene in HER class, and it must still be live — a request that
// names somebody else's scene is refused, never silently stored. The one case
// that degrades instead of failing is the deploy window: if migration 335 has
// not been pasted yet the `scenes` capability is false, and the photo saves
// unlabelled with `sceneId: null` in the response, rather than a teacher's
// morning of shots bouncing off a column that does not exist yet.

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
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
  proxyUrl,
  POTATO_BUCKET,
  potatoCapabilities,
  loadOwnedScene,
} from '@/lib/potato/db';
import { storageDateFolders } from '@/lib/potato/week';
import { resolveCapturedAt } from '@/lib/potato/captured-at';

export const dynamic = 'force-dynamic';
// v1.6: 60s was ample for a 10MB photo and is not for a 200MB video on
// classroom wifi. 300 matches the media proxy, which already streams films of
// this size in the other direction.
export const maxDuration = 300;

/** Standalone-app preflight. A no-op for the website, which never preflights. */
export const OPTIONS = potatoOptionsHandler;

const MAX_BYTES = 10 * 1024 * 1024;
/**
 * v1.6 — the video cap. Twenty times the photo cap, because three minutes off a
 * modern phone at 1080p is comfortably 100MB+ and a teacher who has to guess
 * why "it didn't work" will simply stop using the feature.
 */
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
/** Three minutes. The client refuses first; this is the wall behind it. */
const MAX_VIDEO_DURATION_SECONDS = 180;

/** Whatever the client sends becomes part of a storage path — keep it boring. */
const CLIENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{7,63}$/;

/**
 * What every read of tp_photos in this route comes back as. `scene_id` is
 * optional because the select list is built at runtime from the capability
 * probe — supabase-js can only infer a row type from a LITERAL select list, so
 * a runtime one is cast here instead, once, in one place.
 */
interface PhotoRow {
  id: string;
  storage_path: string;
  captured_at: string;
  scene_id?: string | null;
  /** v1.6 — absent before migration 338, which reads as 'photo'. */
  media_type?: string | null;
  duration_seconds?: number | null;
}

/**
 * The allow-list, doubling as the extension map. A MIME that is not a key here
 * is a 415 — there is no sniffing and no "probably fine" branch.
 *
 * `video/quicktime` is what an iPhone's library hands over for a .mov and is
 * the single most likely video a teacher will pick. `video/3gpp` is here for
 * the older and Chinese-market Android handsets that still record 3gp, which
 * are exactly the devices in the classrooms this product ships to.
 */
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  // v1.6 — video.
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/3gpp': '3gp',
};

/** 'photo' | 'video', decided by the MIME and by nothing else. */
function mediaTypeFor(mime: string): 'photo' | 'video' {
  return mime.startsWith('video/') ? 'video' : 'photo';
}

/**
 * What the client is told this row is. Reported from the ROW, never from the
 * request — on the two duplicate paths those can differ (the winner of a race
 * is whatever actually landed), and the client must follow the database rather
 * than its own optimism. A row with no `media_type` is a pre-338 row, and every
 * pre-338 row is a photo.
 */
function mediaFieldsOf(row: PhotoRow) {
  return {
    mediaType: row.media_type === 'video' ? ('video' as const) : ('photo' as const),
    durationSeconds: row.duration_seconds ?? null,
  };
}

export async function POST(request: NextRequest) {
  // withPotatoCors is a no-op unless the caller is an allow-listed app origin,
  // so the website's response is byte-identical to before.
  return withPotatoCors(await handlePOST(request), request);
}

async function handlePOST(request: NextRequest) {
  const session = await resolvePotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Nothing was attached.' }, { status: 400 });
  }

  // 🚨 TYPE BEFORE SIZE, deliberately. The cap depends on which kind of media
  // this is, so an unknown MIME has to be refused first — otherwise a file
  // claiming `application/zip` would be measured against whichever cap the
  // code happened to reach.
  const mime = (file.type || '').toLowerCase();
  const ext = EXT_BY_MIME[mime];
  if (!ext) {
    return NextResponse.json(
      { error: 'That file type isn’t a photo or video we can use.' },
      { status: 415 },
    );
  }
  const mediaType = mediaTypeFor(mime);
  const isVideo = mediaType === 'video';

  if (isVideo) {
    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { error: 'That video’s too big — try trimming it to under 3 minutes.' },
        { status: 413 },
      );
    }
  } else if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'That photo is too big (10MB max).' }, { status: 413 });
  }

  // ---- durationSeconds: client-measured, video only ------------------------
  // Absent is legal and always has been: some mobile browsers will not give a
  // picked file's metadata up at all, and a video that is under the byte cap
  // but whose length could not be read is still a video worth keeping. What is
  // NOT legal is a length that is present and over the wall.
  let durationSeconds: number | null = null;
  const rawDuration = form.get('durationSeconds');
  if (isVideo && typeof rawDuration === 'string' && rawDuration.trim() !== '') {
    const parsed = Number(rawDuration);
    // NaN / Infinity is the "metadata was unreadable" signal, not an attack —
    // treat it exactly like an absent field rather than failing the upload.
    if (Number.isFinite(parsed) && parsed > 0) {
      if (parsed > MAX_VIDEO_DURATION_SECONDS) {
        return NextResponse.json(
          { error: 'Videos need to be under 3 minutes — trim it first.' },
          { status: 422 },
        );
      }
      durationSeconds = parsed;
    }
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
  // A whole-room photo, tagged with nobody on purpose. Anything other than the
  // literal '1' is not a claim — an old client that never sends the field, or a
  // stray empty string, still gets the 400 below.
  const isGroup = form.get('group') === '1';
  if (childIds.length === 0 && !isGroup) {
    return NextResponse.json({ error: 'Tap at least one child before saving.' }, { status: 400 });
  }

  // ---- capturedAt: trusted within limits (see lib/potato/captured-at.ts) ----
  const { capturedAt, note: capturedAtNote } = resolveCapturedAt(form.get('capturedAt'));

  // ---- clientId: stable across retries, so a retry is idempotent -----------
  const rawClientId = form.get('clientId');
  const clientId =
    typeof rawClientId === 'string' && CLIENT_ID_RE.test(rawClientId) ? rawClientId : null;

  // ---- sceneId: optional, validated below against the caller's own class ---
  // An empty string is treated as "not sent" — a multipart form that always
  // includes the field is easier for the app than one that conditionally omits
  // it, so "" must mean the same thing as absent: no scene.
  const rawSceneId = form.get('sceneId');
  const sceneIdWanted =
    typeof rawSceneId === 'string' && rawSceneId.trim() !== '' ? rawSceneId.trim() : null;
  if (sceneIdWanted && !UUID_RE.test(sceneIdWanted)) {
    return NextResponse.json({ error: 'Invalid sceneId' }, { status: 400 });
  }

  const supabase = potatoDb();
  let storagePath: string | null = null;
  let photoId: string | null = null;

  try {
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // 🚨 Class ownership on every tagged child. Existence is not ownership.
    // Skipped entirely for a group photo: `.in('id', [])` is a query with no
    // question in it, and there is nothing to prove when nobody was named.
    let ownedIds: string[] = [];
    if (childIds.length > 0) {
      const { data: owned, error: ownedError } = await supabase
        .from('tp_children')
        .select('id')
        .eq('class_id', session.classId)
        .eq('is_active', true)
        .in('id', childIds);
      if (ownedError) throw ownedError;
      ownedIds = ((owned ?? []) as { id: string }[]).map((row) => row.id);
      if (ownedIds.length !== childIds.length) {
        return NextResponse.json({ error: 'One of those children isn’t in this class.' }, { status: 403 });
      }
    }

    // v1.4 (uploaded_by) and v1.0.1 (scene_id) both ride on this one probe —
    // hoisted above the upload so the scene can be validated, and the
    // idempotency read can ask for scene_id, before a byte is written.
    const caps = await potatoCapabilities(supabase);
    // Typed as `string`, not as the literal union: supabase-js parses a literal
    // select list at compile time, and a UNION of two lists is exactly what
    // produces the ParserError noise already visible in lib/potato/db.ts.
    const photoColumns: string = [
      'id, storage_path, captured_at',
      caps.scenes ? ', scene_id' : '',
      caps.media ? ', media_type, duration_seconds' : '',
    ].join('');

    // 🚨 v1.6 — THE ONE PLACE THIS FEATURE REFUSES INSTEAD OF DEGRADING.
    // Every other capability gap here loses a LABEL and keeps the shot: a
    // photo saved without an uploader's name or without a scene is still that
    // photo. A video saved without `media_type` is not a video as far as the
    // rest of the product is concerned — it is a row that says 'photo', which
    // the board counts toward a film and the stills renderer in potato-worker/
    // would then try to draw. That is a broken film sent to a family, so
    // during the deploy window a video is turned away with a sentence a
    // teacher can act on, and her photos keep working exactly as before.
    if (isVideo && !caps.media) {
      return NextResponse.json(
        { error: 'Video isn’t switched on yet. Photos still work — try again later today.' },
        { status: 503 },
      );
    }

    // 🚨 Class ownership on the scene too, and it must still be live: a chip
    // the teacher can no longer see is not a chip she can tag with. Both are
    // one row's worth of check, and skipping either would let a crafted
    // request file this class's photo under another class's label.
    let scene: { id: string; name: string } | null = null;
    if (sceneIdWanted && caps.scenes) {
      const found = await loadOwnedScene(supabase, session.classId, sceneIdWanted);
      if (!found) return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
      if (found.is_active === false) {
        return NextResponse.json({ error: 'That scene is hidden.' }, { status: 409 });
      }
      scene = { id: found.id, name: found.name };
    }

    // Every response below reports the scene the ROW actually carries, not the
    // one the request asked for — on the duplicate paths those can differ, and
    // the client's chip must follow the database, not its own optimism.
    const sceneLabel = async (rowSceneId: string | null | undefined) => {
      if (!rowSceneId) return { sceneId: null as string | null, sceneName: null as string | null };
      if (scene && scene.id === rowSceneId) return { sceneId: scene.id, sceneName: scene.name };
      const found = await loadOwnedScene(supabase, session.classId, rowSceneId);
      return { sceneId: rowSceneId as string | null, sceneName: found?.name ?? null };
    };

    // Folders follow the CLASS calendar at the moment of CAPTURE, so a Friday
    // photo uploaded on Monday still files under Friday's month.
    const { yyyy, mm } = storageDateFolders(klass.tz, capturedAt);
    const objectName = clientId ?? randomUUID();
    storagePath = `class/${session.classId}/photos/${yyyy}/${mm}/${objectName}.${ext}`;

    // Idempotency: if this exact capture already landed, the retry is a no-op.
    if (clientId) {
      const { data: alreadyRaw, error: alreadyError } = await supabase
        .from('tp_photos')
        .select(photoColumns)
        .eq('class_id', session.classId)
        .eq('storage_path', storagePath)
        .maybeSingle();
      if (alreadyError) throw alreadyError;
      const already = alreadyRaw as PhotoRow | null;
      if (already) {
        return NextResponse.json({
          ok: true,
          duplicate: true,
          photo: {
            id: already.id,
            url: proxyUrl(already.storage_path),
            capturedAt: already.captured_at,
            childIds: ownedIds,
            ...mediaFieldsOf(already),
            ...(await sceneLabel(already.scene_id)),
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
    // v1.0.1: same treatment for the scene (migration 335).
    const insertRow: Record<string, unknown> = {
      class_id: session.classId,
      storage_path: storagePath,
      captured_at: capturedAt.toISOString(),
    };
    if (caps.attribution && session.staffName) insertRow.uploaded_by = session.staffName;
    if (caps.scenes && scene) insertRow.scene_id = scene.id;
    // v1.6. `media_type` is written for a photo too rather than leaning on the
    // column default: the default is a migration's opinion about rows that
    // already existed, and a row this route inserts should say what it is.
    // `file_size_bytes` is the count of bytes we ACTUALLY read and uploaded —
    // never a number the client reported.
    if (caps.media) {
      insertRow.media_type = mediaType;
      insertRow.file_size_bytes = bytes.byteLength;
      if (durationSeconds !== null) insertRow.duration_seconds = durationSeconds;
    }

    const { data: photoRaw, error: insertError } = await supabase
      .from('tp_photos')
      .insert(insertRow)
      .select(photoColumns)
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
        const { data: winnerRaw, error: winnerError } = await supabase
          .from('tp_photos')
          .select(photoColumns)
          .eq('class_id', session.classId)
          .eq('storage_path', conflictingPath)
          .maybeSingle();
        if (winnerError) throw winnerError;
        const winner = winnerRaw as PhotoRow | null;
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
              ...mediaFieldsOf(winner),
              ...(await sceneLabel(winner.scene_id)),
            },
          });
        }
      }
      throw insertError;
    }
    const photo = photoRaw as PhotoRow | null;
    if (!photo) throw new Error('Photo row was not returned after insert');
    photoId = photo.id;

    // A group photo has no rows to write here, and that absence IS the fact
    // being recorded — it is why the photo counts for nobody's bar and still
    // reaches the class film. An INSERT of an empty list is not the same thing:
    // it is a round trip that can only fail.
    if (ownedIds.length > 0) {
      const { error: tagError } = await supabase
        .from('tp_photo_children')
        .insert(ownedIds.map((childId) => ({ photo_id: photo.id, child_id: childId })));
      if (tagError) throw tagError;
    }

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
        // v1.6 — 'photo' for every caller that never sends a video, which is
        // every client older than this one.
        ...mediaFieldsOf(photo),
        // null when she picked no scene AND when migration 335 has not landed
        // yet — the client treats both the same way: an unlabelled photo.
        ...(await sceneLabel(caps.scenes ? photo.scene_id : null)),
      },
    });
  } catch (error) {
    // A photo whose tags did not land is invisible to the board and to every
    // child's montage, so a half-written upload is rolled back rather than left
    // as a ghost. (A deliberate group photo never reaches here for that reason:
    // it has no tags to fail. If anything else throws, rolling its row back is
    // still right — a request that returned an error must leave nothing behind.)
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
