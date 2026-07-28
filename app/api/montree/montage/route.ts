// /api/montree/montage
//
// Montage Studio — teacher-initiated montages across three scopes
// (whole classroom / one child / one special event) in three flavours
// (daily / weekly / custom range).
//
//   POST { scope_type, kind, child_id?, event_id?, date_start?, date_end?,
//          classroom_id?, bypass_confirmation?, media_ids? }
//        → queues a montree_montage_jobs row for the Railway worker.
//          media_ids (migration 306, Montage Manager only, requires
//          bypass_confirmation) is an EXPLICIT teacher-curated photo set —
//          re-verified server-side, then rendered verbatim by the worker.
//   GET  ?limit=20
//        → the teacher's recent SCOPED montages (report montages excluded —
//          those live on the Weekly Wrap tab).
//
// 🚨 TIMEZONE. Teachers are in Asia/Shanghai but schools vary and the app
// stores no per-school timezone. So the CLIENT computes date_start/date_end
// from the BROWSER's local calendar date ("today" = the teacher's today) and
// this route only validates the YYYY-MM-DD shape. Server-side fallbacks below
// use UTC and exist purely so a malformed/legacy client still gets something
// sensible — they are not the intended path.
//
// 42P01/42703-safe: before migration 304 the scoped columns don't exist, so
// both verbs degrade to a clean 503 / empty list instead of a 500.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import {
  enqueueScopedMontage,
  type MontageScopeType,
  type MontageKind,
  minPhotosForScope,
} from '@/lib/montree/montage/enqueue';
import {
  verifyMediaIds,
  MAX_PICKER_PHOTOS,
} from '@/lib/montree/montage-tracker/media';

const SCOPE_TYPES: MontageScopeType[] = ['classroom', 'child', 'event'];
const KINDS: MontageKind[] = ['daily', 'weekly', 'custom'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Mirrors MAX_PICKER_PHOTOS — the picker can never hand us more than it shows. */
const MAX_MEDIA_IDS = MAX_PICKER_PHOTOS;

function isMissingSchema(code?: string): boolean {
  return code === '42P01' || code === '42703';
}

/** UTC-based fallback only — see the timezone note at the top of the file. */
function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function utcDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  // Montage Studio is a classroom tool — teachers and principals only.
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const scopeType = body.scope_type as MontageScopeType;
  const kind = body.kind as MontageKind;
  if (!SCOPE_TYPES.includes(scopeType)) {
    return NextResponse.json({ error: 'scope_type must be classroom, child or event' }, { status: 400 });
  }
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: 'kind must be daily, weekly or custom' }, { status: 400 });
  }

  const rawStart = typeof body.date_start === 'string' ? body.date_start : null;
  const rawEnd = typeof body.date_end === 'string' ? body.date_end : null;
  if ((rawStart && !DATE_RE.test(rawStart)) || (rawEnd && !DATE_RE.test(rawEnd))) {
    return NextResponse.json({ error: 'date_start / date_end must be YYYY-MM-DD' }, { status: 400 });
  }

  // Fill in the range the client didn't send. Daily = the single day,
  // weekly = the trailing 7 days (inclusive of today).
  let dateStart = rawStart;
  let dateEnd = rawEnd;
  if (kind === 'daily') {
    dateStart = dateStart || utcToday();
    dateEnd = dateEnd || dateStart;
  } else if (kind === 'weekly') {
    dateEnd = dateEnd || utcToday();
    dateStart = dateStart || utcDaysAgo(6);
  }
  if (kind === 'custom' && scopeType !== 'event' && (!dateStart || !dateEnd)) {
    return NextResponse.json({ error: 'custom montages need date_start and date_end' }, { status: 400 });
  }
  if (dateStart && dateEnd && dateStart > dateEnd) {
    return NextResponse.json({ error: 'date_start must be on or before date_end' }, { status: 400 });
  }

  // --- Montage Tracker bypass (migration 305) ------------------------------
  // The tracker counts every tagged photo the moment it is captured, so its
  // montages must be allowed to draw from unconfirmed photos too. Only the
  // two tracker scopes may ask for it; parent_visible stays enforced in the
  // enqueue query, in the worker query and in the worker's re-assert.
  //
  // Montage Manager (Jul 28) widened this to the EVENT scope too — the
  // Manager's "Special event" path is the same confirmation-free workflow, and
  // an event's photos are just as unreviewed the afternoon they were taken.
  const bypassConfirmation = body.bypass_confirmation === true;

  // --- Montage Manager explicit selection (migration 306) ------------------
  // The teacher curated the photo set in the picker grid. The list is
  // RE-VERIFIED server-side below (school + photo + parent_visible) — the
  // client is never trusted with the safety gate. Only legal on the
  // confirmation-free Manager path; a Studio job still describes its scope.
  let mediaIds: string[] | null = null;
  if (body.media_ids !== undefined && body.media_ids !== null) {
    if (!bypassConfirmation) {
      return NextResponse.json(
        { error: 'media_ids requires bypass_confirmation' },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.media_ids)) {
      return NextResponse.json({ error: 'media_ids must be an array' }, { status: 400 });
    }
    if (body.media_ids.length > MAX_MEDIA_IDS) {
      return NextResponse.json(
        { error: `media_ids may not exceed ${MAX_MEDIA_IDS} entries` },
        { status: 400 }
      );
    }
    const ids = body.media_ids.filter(
      (v): v is string => typeof v === 'string' && UUID_RE.test(v)
    );
    if (ids.length !== body.media_ids.length) {
      return NextResponse.json({ error: 'media_ids must all be uuids' }, { status: 400 });
    }
    mediaIds = [...new Set(ids)];
  }

  try {
    const supabase = getSupabase();

    // --- classroom resolution --------------------------------------------
    // A teacher is pinned to her own classroom. A principal (no classroomId
    // on the token) may target any classroom in her school via body.
    let classroomId: string | null = auth.classroomId ?? null;
    const bodyClassroomId = typeof body.classroom_id === 'string' ? body.classroom_id : null;
    if (bodyClassroomId && bodyClassroomId !== classroomId) {
      if (auth.classroomId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      classroomId = bodyClassroomId;
    }
    if (classroomId) {
      const { data: room } = await supabase
        .from('montree_classrooms')
        .select('id')
        .eq('id', classroomId)
        .eq('school_id', auth.schoolId)
        .maybeSingle();
      if (!room) {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
      }
    }

    // --- scope validation + title derivation ------------------------------
    const childId = typeof body.child_id === 'string' ? body.child_id : null;
    const eventId = typeof body.event_id === 'string' ? body.event_id : null;
    let title = '';

    if (scopeType === 'child') {
      if (!childId) {
        return NextResponse.json({ error: 'child_id is required' }, { status: 400 });
      }
      const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
      if (!access.allowed) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      // Scope the job to the child's own classroom — that's the room the
      // teacher's "Recent montages" list is keyed on.
      classroomId = access.classroomId ?? classroomId;
      const { data: child } = await supabase
        .from('montree_children')
        .select('name')
        .eq('id', childId)
        .maybeSingle();
      title = (child as { name?: string } | null)?.name || 'A child';
    } else if (scopeType === 'event') {
      if (!eventId) {
        return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
      }
      const { data: event } = await supabase
        .from('montree_events')
        .select('id, name, classroom_id')
        .eq('id', eventId)
        .eq('school_id', auth.schoolId)
        .maybeSingle();
      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      title = (event as { name?: string }).name || 'Special event';
      classroomId = (event as { classroom_id?: string | null }).classroom_id ?? classroomId;
      // Events are their own boundary — a date range is optional noise there,
      // for EVERY kind tab, not just Custom. The client computes and sends a
      // dateStart/dateEnd for the Daily/Weekly tabs regardless of scope (see
      // MontageStudio's handleCreate), so without this an event montage on
      // the Daily tab would silently only draw from "today", contradicting
      // the 'montage.rangeEvent' hint ("Every photo linked to this event")
      // the UI always shows for this scope. Ignore whatever the client sent.
      dateStart = null;
      dateEnd = null;
    } else {
      if (!classroomId) {
        return NextResponse.json({ error: 'classroom_id is required' }, { status: 400 });
      }
      const { data: room } = await supabase
        .from('montree_classrooms')
        .select('name')
        .eq('id', classroomId)
        .maybeSingle();
      title = (room as { name?: string } | null)?.name || 'Our classroom';
    }

    // --- explicit selection: re-verify + enforce the floor (migration 306) --
    // 🚨 The picker's list is a CLIENT payload. Re-read every id and keep only
    // this school's parent-visible photos, then enforce the scope's minimum
    // against the SURVIVORS — never against what the client claimed. The
    // verified list is what the dup lookup compares and what the job stores.
    if (mediaIds) {
      try {
        mediaIds = await verifyMediaIds(supabase, {
          schoolId: auth.schoolId,
          mediaIds,
        });
      } catch (verifyErr) {
        const code = (verifyErr as { code?: string } | null)?.code;
        if (isMissingSchema(code)) {
          return NextResponse.json({ error: 'montage system not migrated' }, { status: 503 });
        }
        console.error('[montage] media_ids verification failed:', verifyErr);
        return NextResponse.json({ error: 'Failed to queue montage' }, { status: 500 });
      }

      const minPhotos = minPhotosForScope(scopeType);
      if (mediaIds.length < minPhotos) {
        return NextResponse.json({
          ok: false,
          reason: 'insufficient_photos',
          photo_count: mediaIds.length,
          min_photos: minPhotos,
        });
      }
    }

    // --- duplicate suppression -------------------------------------------
    // Same scope + kind + range already queued or rendering? Hand back that
    // job rather than making the worker render the identical film twice.
    //
    // 🚨 A tracker montage (every tagged photo) and a Studio montage
    // (confirmed only) over the same scope + kind + range are DIFFERENT
    // films, so require_confirmed is part of the identity — the lookup is
    // constrained on BOTH paths, never one.
    //
    // 🚨 Migration 306: two Manager jobs over the SAME scope + kind + range
    // can be different films if the teacher curated different photo sets, so
    // when the incoming request carries media_ids a candidate only counts as
    // a duplicate if its own media_ids is the SAME SET. With no media_ids the
    // lookup behaves exactly as it always has (first active match wins).
    const DUP_COLUMNS = 'id, status, title, output_path';
    // With a curated selection we must inspect several candidates, not just
    // the first — an earlier job for this scope may hold a different set.
    const DUP_LIMIT = mediaIds ? 20 : 1;

    type DupTier = 'full' | 'require_confirmed' | 'base';
    const dupColumnsFor = (tier: DupTier) =>
      tier === 'full'
        ? `${DUP_COLUMNS}, require_confirmed, media_ids`
        : tier === 'require_confirmed'
          ? `${DUP_COLUMNS}, require_confirmed`
          : DUP_COLUMNS;

    const dupQuery = (tier: DupTier) => {
      const withRequireConfirmed = tier !== 'base';
      let q = supabase
        .from('montree_montage_jobs')
        .select(dupColumnsFor(tier))
        .eq('school_id', auth.schoolId)
        .eq('scope_type', scopeType)
        .eq('montage_kind', kind)
        .in('status', ['queued', 'rendering'])
        .limit(DUP_LIMIT);

      if (scopeType === 'child') q = q.eq('child_id', childId as string);
      else if (scopeType === 'event') q = q.eq('event_id', eventId as string);
      else q = q.eq('classroom_id', classroomId as string);

      q = dateStart ? q.eq('date_start', dateStart) : q.is('date_start', null);
      q = dateEnd ? q.eq('date_end', dateEnd) : q.is('date_end', null);

      if (withRequireConfirmed) q = q.eq('require_confirmed', !bypassConfirmation);
      return q;
    };

    // Selected optimistically and retried on a narrower column set, so a
    // school that has not run 306 (or 305) yet never sees a 42703 turn into
    // a 500 — it just loses the extra identity dimension it has no column for.
    let { data: existingRows, error: existErr } = await dupQuery('full');
    if (existErr && isMissingSchema(existErr.code)) {
      ({ data: existingRows, error: existErr } = await dupQuery('require_confirmed'));
    }
    if (existErr && isMissingSchema(existErr.code) && !bypassConfirmation) {
      // Pre-305 school: the column doesn't exist yet, so no tracker job can
      // exist either — the unfiltered lookup IS the historical behaviour.
      // A bypass request falls through to the 503 below instead: without the
      // column its job can't be inserted anyway.
      ({ data: existingRows, error: existErr } = await dupQuery('base'));
    }
    if (existErr) {
      if (isMissingSchema(existErr.code)) {
        return NextResponse.json({ error: 'montage system not migrated' }, { status: 503 });
      }
      console.error('[montage] duplicate lookup failed:', existErr.message);
      return NextResponse.json({ error: 'Failed to queue montage' }, { status: 500 });
    }
    const candidates = ((existingRows || []) as unknown) as Array<{
      id: string;
      status: string;
      title: string | null;
      output_path: string | null;
      require_confirmed?: boolean;
      media_ids?: string[] | null;
    }>;

    // No curated selection → historical behaviour: the first active job over
    // this scope + kind + range IS the duplicate. With a selection, only an
    // identical SET counts; a different pick deserves its own film. A pre-306
    // row (media_ids undefined/null) is a whole-scope job, never the same
    // thing as a hand-curated one.
    const wantedSet = mediaIds ? new Set(mediaIds) : null;
    const sameSelection = (rowIds: unknown): boolean => {
      if (!Array.isArray(rowIds)) return false;
      const rowSet = new Set(rowIds.filter((v): v is string => typeof v === 'string'));
      if (rowSet.size !== wantedSet!.size) return false;
      for (const id of rowSet) if (!wantedSet!.has(id)) return false;
      return true;
    };
    const existing = wantedSet
      ? candidates.find((row) => sameSelection(row.media_ids))
      : candidates[0];

    if (existing) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        job: {
          id: existing.id,
          status: existing.status,
          title: existing.title,
          scope_type: scopeType,
          montage_kind: kind,
          date_start: dateStart,
          date_end: dateEnd,
          // The row's own value — pre-305 rows have no column at all, which
          // means the historical confirmed-only default.
          require_confirmed: existing.require_confirmed === false ? false : true,
        },
      });
    }

    // --- enqueue ----------------------------------------------------------
    const result = await enqueueScopedMontage(supabase, {
      schoolId: auth.schoolId,
      classroomId,
      scopeType,
      childId,
      eventId,
      kind,
      dateStart,
      dateEnd,
      title,
      requireConfirmed: !bypassConfirmation,
      mediaIds,
    });

    if (!result.ok) {
      if (result.reason === 'not_migrated') {
        return NextResponse.json({ error: 'montage system not migrated' }, { status: 503 });
      }
      if (result.reason === 'insufficient_photos') {
        return NextResponse.json({
          ok: false,
          reason: 'insufficient_photos',
          photo_count: result.photoCount,
          min_photos: result.minPhotos,
        });
      }
      return NextResponse.json({ error: 'Failed to queue montage' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      photo_count: result.photoCount,
      min_photos: result.minPhotos,
      job: {
        id: result.jobId,
        status: 'queued',
        title,
        scope_type: scopeType,
        montage_kind: kind,
        date_start: dateStart,
        date_end: dateEnd,
        require_confirmed: !bypassConfirmation,
      },
    });
  } catch (error) {
    console.error('[montage] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsedLimit = parseInt(searchParams.get('limit') || '20', 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 20;

  try {
    const supabase = getSupabase();

    // Teacher → her classroom's montages. Principal (no classroom on token)
    // → the whole school's.
    const BASE_COLUMNS =
      'id, scope_type, montage_kind, status, title, output_path, date_start, date_end, created_at, finished_at, error, child_id, event_id, classroom_id';

    // require_confirmed (migration 305) lets a client tell Montage Tracker
    // jobs apart from Montage Studio ones. Selected optimistically and
    // retried without it pre-migration, so a school that hasn't run 305 keeps
    // seeing its list instead of an empty one.
    const runQuery = (columns: string) => {
      let q = supabase
        .from('montree_montage_jobs')
        .select(columns)
        .eq('school_id', auth.schoolId)
        .neq('scope_type', 'report')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (auth.classroomId) q = q.eq('classroom_id', auth.classroomId);
      return q;
    };

    let { data: jobs, error } = await runQuery(`${BASE_COLUMNS}, require_confirmed`);
    if (error && isMissingSchema(error.code)) {
      ({ data: jobs, error } = await runQuery(BASE_COLUMNS));
    }
    if (error) {
      if (isMissingSchema(error.code)) {
        return NextResponse.json({ success: true, montages: [] });
      }
      console.error('[montage] GET failed:', error.message);
      return NextResponse.json({ error: 'Failed to fetch montages' }, { status: 500 });
    }

    const rows = ((jobs || []) as unknown) as Array<Record<string, unknown>>;

    // Resolve display names for child / event scoped rows in two batched reads.
    const childIds = [...new Set(rows.map(r => r.child_id).filter((v): v is string => typeof v === 'string'))];
    const eventIds = [...new Set(rows.map(r => r.event_id).filter((v): v is string => typeof v === 'string'))];

    const [childRes, eventRes] = await Promise.all([
      childIds.length
        ? supabase.from('montree_children').select('id, name').in('id', childIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
      eventIds.length
        ? supabase.from('montree_events').select('id, name').in('id', eventIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    ]);

    const childNames = new Map<string, string>();
    for (const c of (childRes.data || []) as Array<{ id: string; name: string }>) childNames.set(c.id, c.name);
    const eventNames = new Map<string, string>();
    for (const e of (eventRes.data || []) as Array<{ id: string; name: string }>) eventNames.set(e.id, e.name);

    const montages = rows.map(r => ({
      id: r.id as string,
      scope_type: r.scope_type as string,
      montage_kind: r.montage_kind as string,
      status: r.status as string,
      title:
        (r.title as string | null) ||
        (typeof r.child_id === 'string' ? childNames.get(r.child_id) : null) ||
        (typeof r.event_id === 'string' ? eventNames.get(r.event_id) : null) ||
        'Montage',
      child_name: typeof r.child_id === 'string' ? childNames.get(r.child_id) ?? null : null,
      event_name: typeof r.event_id === 'string' ? eventNames.get(r.event_id) ?? null : null,
      output_path: (r.output_path as string | null) ?? null,
      date_start: (r.date_start as string | null) ?? null,
      date_end: (r.date_end as string | null) ?? null,
      created_at: (r.created_at as string | null) ?? null,
      finished_at: (r.finished_at as string | null) ?? null,
      error: (r.error as string | null) ?? null,
      // Pre-305 rows have no column at all → treat as the historical default.
      require_confirmed: r.require_confirmed === false ? false : true,
    }));

    return NextResponse.json({ success: true, montages });
  } catch (error) {
    console.error('[montage] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
