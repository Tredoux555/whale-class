// app/api/montree/classroom-jobs/route.ts
// ============================================================================
// THE CLASSROOM JOBS POSTER — read the room's chart, save the room's chart.
// ============================================================================
// One classroom, one jobs chart, stored on the row that classroom already has:
//
//   montree_classrooms.settings.jobs_poster
//
// 🚨 NO MIGRATION. `settings` (JSONB) has been on `montree_classrooms` since
// migration 067 — the same shared bag `brand_kit` lives in. Every write here
// is read-merge-write, because writing `{ jobs_poster }` over that column
// would quietly delete a room's emblem along with whatever else is parked
// there. (Prior art, and the same trap spelled out: the `settingsBag` note in
// app/api/montree/brand-kit/route.ts.)
//
// 🚨 TENANCY COMES FROM THE SESSION. A `classroomId` may arrive on the query
// string or in the body — it is a NARROWING, never an authority. Every call
// re-proves that the room belongs to `auth.schoolId` before reading or writing
// a byte of it, and a room belonging to another school reads identically to a
// room that is not there. The Jul-3 lesson: existence is not ownership.
//
// 🚨 READS FAIL SOFT, WRITES FAIL LOUD. A room whose settings column cannot be
// read gets the default job list and a flag saying so — a teacher who wanted
// to print a chart gets a chart. A SAVE that cannot be written returns 500,
// because a save that silently does nothing is the worst outcome this route
// has.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import {
  JOBS_POSTER_VERSION,
  defaultJobsPoster,
  parseJobsPoster,
  readJobsPosterFromSettings,
  scrubAssignments,
  type ClassroomJob,
  type JobsPoster,
} from '@/lib/montree/classroom-jobs/types';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Who may edit a room's chart. Same posture, and the same reasoning, as
 * `mayConfigureBrand` in the brand-kit route: agent and org-admin tokens carry
 * an INERT schoolId (see lib/montree/server-auth.ts), so letting one through
 * would write a jobs chart into whichever school happened to be on the token.
 * A verified session that does not expose a role is read as a school session,
 * which is what it has always been.
 */
function mayEditJobs(auth: unknown): boolean {
  const role = (auth as { role?: string } | null)?.role;
  return !role || role === 'teacher' || role === 'principal' || role === 'homeschool_parent';
}

interface ClassroomRow {
  id: string;
  school_id: string;
  name: string | null;
  settings: Record<string, unknown> | null;
}

/**
 * The settings bag, or an empty one.
 *
 * 🚨 SPREADING A NON-OBJECT IS A DATA-LOSS BUG, not a type error: a row that
 * comes back as a JSON *string* spreads CHARACTER BY CHARACTER, and the update
 * then writes that over the room's whole settings bag. Anything that is not a
 * plain object is treated as absent.
 */
function settingsBag(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * The classroom, re-proved to belong to the SESSION's school.
 *
 * `'forbidden'` covers both "not yours" and "not there" on purpose — telling a
 * caller which of the two it was is a tenant enumeration oracle. `null` means
 * the read itself failed, which the callers deliberately do NOT agree about:
 * a GET degrades to the default chart, a POST refuses.
 */
async function loadClassroom(
  supabase: ReturnType<typeof getSupabase>,
  schoolId: string,
  classroomId: string
): Promise<ClassroomRow | 'forbidden' | null> {
  const { data, error } = await supabase
    .from('montree_classrooms')
    .select('id, school_id, name, settings')
    .eq('id', classroomId)
    .maybeSingle();

  if (error) {
    console.warn('[classroom-jobs] classroom read soft-failed:', error.message);
    return null;
  }
  const row = (data as ClassroomRow | null) ?? null;
  if (!row || row.school_id !== schoolId) return 'forbidden';
  return row;
}

/**
 * The room being asked about: the explicit `classroomId` when there is one,
 * otherwise the one baked into the session's token. A principal's token often
 * carries no classroom, which is exactly why the explicit parameter exists.
 */
function resolveClassroomId(explicit: string, tokenClassroomId?: string): string {
  return explicit || tokenClassroomId || '';
}

/** Every child id ON this classroom — active or not. See `scrubAssignments`. */
async function loadKnownChildIds(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string
): Promise<ReadonlySet<string> | null> {
  const { data, error } = await supabase
    .from('montree_children')
    .select('id')
    .eq('classroom_id', classroomId);

  if (error) {
    console.warn('[classroom-jobs] roster read soft-failed:', error.message);
    return null;
  }
  return new Set(((data as { id: string }[] | null) ?? []).map((r) => r.id));
}

/**
 * Drop a job's `imageUrl`/`imagePath` if the path does not belong to THIS
 * classroom's own storage folder.
 *
 * 🚨 THIS CANNOT LIVE IN THE PURE PARSER — `parseJobsPoster` has no schoolId
 * or classroomId to check a path against, and it must not: that parser also
 * runs on data this route has no auth context for (a settings-column read).
 * Here, on a save, the auth context IS the classroom being saved to, so this
 * is the one place a forged path — pointing at another tenant's uploaded file
 * — gets caught before it can be stored. Same Jul-3 posture as the brand-kit
 * upload cleanup, applied to a READ path rather than a delete.
 */
function scrubJobImagePaths(
  poster: JobsPoster,
  schoolId: string,
  classroomId: string
): JobsPoster {
  const prefix = `brand/${schoolId}/classroom/${classroomId}/jobs/`;
  return {
    ...poster,
    jobs: poster.jobs.map((j): ClassroomJob => {
      if (!j.imagePath) return j;
      if (j.imagePath.startsWith(prefix) && !j.imagePath.includes('..')) return j;
      return { id: j.id, icon: j.icon, name: j.name, active: j.active, childId: j.childId };
    }),
  };
}

// ── GET: the room's chart ───────────────────────────────────────────────────
//
// `?classroomId=` is optional; without it the session's own classroom is used.
// A room that has never saved one gets `defaultJobsPoster()` and
// `isDefault: true`, so the screen can say "starting set" rather than pretend
// twelve jobs were chosen by somebody.

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const explicit =
      searchParams.get('classroomId') || searchParams.get('classroom_id') || '';
    if (explicit && !isUuid(explicit)) {
      return NextResponse.json({ error: 'Invalid classroomId' }, { status: 400 });
    }

    const classroomId = resolveClassroomId(explicit, auth.classroomId);
    if (!classroomId) {
      return NextResponse.json({ error: 'A classroom is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const row = await loadClassroom(supabase, auth.schoolId, classroomId);
    if (row === 'forbidden') {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 403 });
    }

    const stored = row ? readJobsPosterFromSettings(row.settings) : null;

    return NextResponse.json({
      success: true,
      poster: stored ?? defaultJobsPoster(),
      isDefault: !stored,
      classroomId,
      classroomName: row?.name ?? null,
      /** False when the room's row could not be read at all — the screen says
       *  so instead of offering a save that will fail. */
      available: row !== null,
    });
  } catch (error) {
    console.error('[classroom-jobs] GET error:', error);
    // Even here: a teacher who wanted a jobs chart gets a jobs chart.
    return NextResponse.json({
      success: true,
      poster: defaultJobsPoster(),
      isDefault: true,
      classroomId: null,
      classroomName: null,
      available: false,
    });
  }
}

// ── POST: save the room's chart ─────────────────────────────────────────────
//
// Body: `{ classroomId?: string, poster: JobsPoster }`. The poster is REPLACED
// wholesale rather than merged per job: the screen always holds the complete
// list, and a per-job merge would make "I removed a job" indistinguishable
// from "I did not send that job".

export async function POST(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const bodyRoom = (body as { classroomId?: unknown } | null)?.classroomId;
    const explicit =
      (typeof bodyRoom === 'string' && bodyRoom) ||
      searchParams.get('classroomId') ||
      searchParams.get('classroom_id') ||
      '';
    if (explicit && !isUuid(explicit)) {
      return NextResponse.json({ error: 'Invalid classroomId' }, { status: 400 });
    }

    const classroomId = resolveClassroomId(explicit, auth.classroomId);
    if (!classroomId) {
      return NextResponse.json({ error: 'A classroom is required' }, { status: 400 });
    }

    const posted = parseJobsPoster((body as { poster?: unknown } | null)?.poster);
    if (!posted) {
      return NextResponse.json(
        { error: 'A valid jobs poster is required (see lib/montree/classroom-jobs/types).' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // 🚨 THE ROOM IS RE-PROVED ON EVERY SAVE, from the session — never from the
    // body. And a room whose row cannot be READ must refuse rather than fall
    // through to anything else.
    const row = await loadClassroom(supabase, auth.schoolId, classroomId);
    if (row === 'forbidden') {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 403 });
    }
    if (!row) {
      return NextResponse.json(
        { error: 'This classroom cannot store a jobs poster.' },
        { status: 500 }
      );
    }

    // Assignments are checked against the room's OWN roster. A roster read that
    // soft-fails leaves them alone rather than wiping every name off the chart:
    // the ids came from a screen that had just listed this room's children, and
    // an unreadable roster is not evidence that they are wrong.
    const known = await loadKnownChildIds(supabase, classroomId);
    const assignmentScrubbed = known ? scrubAssignments(posted, known) : posted;
    const poster: JobsPoster = {
      ...scrubJobImagePaths(assignmentScrubbed, auth.schoolId, classroomId),
      version: JOBS_POSTER_VERSION,
      updatedAt: new Date().toISOString(),
    };

    // Merge, never replace — `settings` is shared with `brand_kit` and whatever
    // else a future feature parks there.
    const settings = { ...settingsBag(row.settings), jobs_poster: poster };

    const { error: updateError } = await supabase
      .from('montree_classrooms')
      .update({ settings })
      .eq('id', row.id)
      .eq('school_id', auth.schoolId); // belt-and-braces on top of loadClassroom

    if (updateError) {
      console.error('[classroom-jobs] save error:', updateError.message);
      return NextResponse.json({ error: 'Could not save the jobs poster' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      poster,
      classroomId: row.id,
      /** True when at least one assignment named a child this room does not
       *  have — the screen can say "one job was cleared" rather than have a
       *  name quietly vanish. */
      scrubbed: known
        ? poster.jobs.some((j, i) => posted.jobs[i]?.childId && !j.childId)
        : false,
    });
  } catch (error) {
    console.error('[classroom-jobs] POST error:', error);
    return NextResponse.json(
      {
        error: 'Server error',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
