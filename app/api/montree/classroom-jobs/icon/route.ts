// app/api/montree/classroom-jobs/icon/route.ts
// ============================================================================
// A JOB'S ICON PICTURE — upload one, forget the one it replaced.
// ============================================================================
// One job on one room's chart may carry a teacher-uploaded picture in place
// of its emoji. This route does exactly two things and nothing else:
//
//   POST    store a picture, hand back its URL + storage path
//   DELETE  best-effort remove one, by path
//
// 🚨 THIS ROUTE NEVER TOUCHES `settings.jobs_poster`. Saving the poster stays
// the main route's job alone — one writer for that column, same as every
// other shared-bag feature in this codebase. The client uploads here first,
// gets `{ imageUrl, imagePath }` back, sets them on the job in its own state,
// and saves the whole poster through `POST /api/montree/classroom-jobs` the
// way it always has. If this route wrote `settings` too, two routes would be
// racing to read-merge-write the same JSONB column.
//
// 🚨 SAME UPLOAD POSTURE AS app/api/montree/brand-kit/route.ts: PNG/JPG/WebP/
// GIF only (SVG rejected — see that file's header note on why), 4MB cap, a
// timestamped key so nothing is served stale from the Cloudflare cache.
//
// 🚨 TENANCY COMES FROM THE SESSION, re-proved on every call — the Jul-3
// lesson, same as the main classroom-jobs route: a `classroomId` may arrive
// on a form field or in a JSON body, but it is a NARROWING, never an
// authority, and a room belonging to another school reads identically to a
// room that is not there.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';

export const dynamic = 'force-dynamic';

/** Same bucket as every other Montree upload — a public bucket read through
 *  the Cloudflare-cached proxy. */
const BUCKET = 'montree-media';

/** 4MB — a job icon is a job icon, same cap as a school's logo. */
const MAX_ICON_BYTES = 4 * 1024 * 1024;

/** SVG is deliberately not accepted — see the header note in
 *  app/api/montree/brand-kit/route.ts for the full reasoning (it is a
 *  security call, not a taste one: an SVG opened directly renders as a
 *  document, scripts and all). */
const ALLOWED_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Same shape as `ID_RE` in lib/montree/classroom-jobs/types.ts — a job id is
 *  either a DEFAULT_JOBS slug or `custom-<random>`. Checked again here
 *  because this route builds a storage KEY out of it directly; a value that
 *  is not recognisably a job id has no business becoming part of a path. */
const JOB_ID_RE = /^[a-z0-9][a-z0-9_-]{0,47}$/i;
function isValidJobId(value: string): boolean {
  return JOB_ID_RE.test(value);
}

/** Only teachers, principals and homeschool parents edit a room's chart —
 *  same gate, same reasoning, as `mayEditJobs` in the main classroom-jobs
 *  route. Duplicated rather than imported: the two routes are independent
 *  surfaces and a shared helper would be one more thing to keep in sync for
 *  no real saving. */
function mayEditJobs(auth: unknown): boolean {
  const role = (auth as { role?: string } | null)?.role;
  return !role || role === 'teacher' || role === 'principal' || role === 'homeschool_parent';
}

interface ClassroomRow {
  id: string;
  school_id: string;
}

/**
 * The classroom, re-proved to belong to the SESSION's school. `'forbidden'`
 * covers both "not yours" and "not there" — the same tenant-enumeration guard
 * as the main route's `loadClassroom`.
 */
async function loadClassroom(
  supabase: ReturnType<typeof getSupabase>,
  schoolId: string,
  classroomId: string
): Promise<ClassroomRow | 'forbidden' | null> {
  const { data, error } = await supabase
    .from('montree_classrooms')
    .select('id, school_id')
    .eq('id', classroomId)
    .maybeSingle();

  if (error) {
    console.warn('[classroom-jobs/icon] classroom read soft-failed:', error.message);
    return null;
  }
  const row = (data as ClassroomRow | null) ?? null;
  if (!row || row.school_id !== schoolId) return 'forbidden';
  return row;
}

/** Same fallback as the main route: the explicit id when there is one,
 *  otherwise the one baked into the session's token. */
function resolveClassroomId(explicit: string, tokenClassroomId?: string): string {
  return explicit || tokenClassroomId || '';
}

/** This room's own folder for job pictures — nested under the school's, the
 *  same nesting `classroomFolderFor` uses in brand-kit/route.ts, so a single
 *  prefix guard is all a delete or a save-time scrub ever needs. */
function jobsFolderFor(schoolId: string, classroomId: string): string {
  return `brand/${schoolId}/classroom/${classroomId}/jobs`;
}

// ── POST: store a picture ───────────────────────────────────────────────────
//
// multipart/form-data: { classroomId?: string, jobId: string, file: File }.
// Returns `{ success, imageUrl, imagePath }` — the pair the client sets on
// the job in its own state and saves through the main route.

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (!mayEditJobs(auth)) {
      return NextResponse.json({ error: 'Not allowed for this account' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const formData = await request.formData();

    const formRoom = formData.get('classroomId');
    const explicit = typeof formRoom === 'string' ? formRoom : '';
    if (explicit && !isUuid(explicit)) {
      return NextResponse.json({ error: 'Invalid classroomId' }, { status: 400 });
    }

    const classroomId = resolveClassroomId(explicit, auth.classroomId);
    if (!classroomId) {
      return NextResponse.json({ error: 'A classroom is required' }, { status: 400 });
    }

    const jobIdRaw = formData.get('jobId');
    const jobId = typeof jobIdRaw === 'string' ? jobIdRaw : '';
    if (!jobId || !isValidJobId(jobId)) {
      return NextResponse.json({ error: 'A valid jobId is required' }, { status: 400 });
    }

    const maybeFile = formData.get('file');
    const file = maybeFile instanceof File ? maybeFile : null;
    if (!file) {
      return NextResponse.json({ error: 'A file is required' }, { status: 400 });
    }

    const mime = (file.type || '').toLowerCase();
    const ext = ALLOWED_MIME[mime];
    if (!ext) {
      return NextResponse.json(
        { error: 'Use a PNG, JPG, WebP or GIF image.' },
        { status: 400 }
      );
    }
    if (file.size > MAX_ICON_BYTES) {
      return NextResponse.json({ error: 'That image is larger than 4MB.' }, { status: 400 });
    }

    const supabase = getSupabase();

    // 🚨 THE ROOM IS RE-PROVED FROM THE SESSION, never from the form field.
    const row = await loadClassroom(supabase, auth.schoolId, classroomId);
    if (row === 'forbidden') {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 403 });
    }
    if (!row) {
      return NextResponse.json(
        { error: 'This classroom cannot store a job icon.' },
        { status: 500 }
      );
    }

    // Timestamped key, never a fixed name — same reasoning as brand-kit's
    // logo key: a fixed key would be served stale from the Cloudflare cache
    // for as long as its TTL after a teacher replaces the picture.
    const key = `${jobsFolderFor(auth.schoolId, classroomId)}/${jobId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(key, buffer, { contentType: mime, upsert: false });

    if (uploadError) {
      console.error('[classroom-jobs/icon] upload error:', uploadError.message);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imageUrl: getProxyUrl(key),
      imagePath: key,
    });
  } catch (error) {
    console.error('[classroom-jobs/icon] POST error:', error);
    return NextResponse.json(
      {
        error: 'Server error',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// ── DELETE: forget one picture, best-effort ─────────────────────────────────
//
// JSON body: `{ classroomId?: string, imagePath: string }`. Called by the
// client after a REPLACEMENT upload succeeds, or when a teacher removes a
// job's picture outright — never blocking on the result either way, so this
// always answers `{ success: true }` once ownership is proved: a file that
// was already gone, or a path that does not belong to this room's own
// folder, costs nothing more than the bytes it would have freed.

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (!mayEditJobs(auth)) {
      return NextResponse.json({ error: 'Not allowed for this account' }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

    const explicit = typeof b.classroomId === 'string' ? b.classroomId : '';
    if (explicit && !isUuid(explicit)) {
      return NextResponse.json({ error: 'Invalid classroomId' }, { status: 400 });
    }

    const classroomId = resolveClassroomId(explicit, auth.classroomId);
    if (!classroomId) {
      return NextResponse.json({ error: 'A classroom is required' }, { status: 400 });
    }

    const imagePath = typeof b.imagePath === 'string' ? b.imagePath : '';
    if (!imagePath) {
      return NextResponse.json({ success: true });
    }

    const supabase = getSupabase();

    // 🚨 THE ROOM IS RE-PROVED FROM THE SESSION before anything is removed.
    const row = await loadClassroom(supabase, auth.schoolId, classroomId);
    if (row === 'forbidden') {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 403 });
    }
    if (!row) {
      // Ownership could not be re-proved — best-effort means doing nothing
      // rather than deleting on a guess.
      return NextResponse.json({ success: true });
    }

    // Remove ONLY inside this room's own jobs folder, and never a path that
    // could walk out of it — the same guard brand-kit's cleanup uses.
    const prefix = `${jobsFolderFor(auth.schoolId, classroomId)}/`;
    if (imagePath.startsWith(prefix) && !imagePath.includes('..')) {
      const { error: removeError } = await supabase.storage.from(BUCKET).remove([imagePath]);
      if (removeError) {
        console.warn('[classroom-jobs/icon] removal failed:', removeError.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[classroom-jobs/icon] DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
