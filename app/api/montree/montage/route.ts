// /api/montree/montage
//
// Montage Studio — teacher-initiated montages across three scopes
// (whole classroom / one child / one special event) in three flavours
// (daily / weekly / custom range).
//
//   POST { scope_type, kind, child_id?, event_id?, date_start?, date_end?, classroom_id? }
//        → queues a montree_montage_jobs row for the Railway worker.
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
} from '@/lib/montree/montage/enqueue';

const SCOPE_TYPES: MontageScopeType[] = ['classroom', 'child', 'event'];
const KINDS: MontageKind[] = ['daily', 'weekly', 'custom'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

    // --- duplicate suppression -------------------------------------------
    // Same scope + kind + range already queued or rendering? Hand back that
    // job rather than making the worker render the identical film twice.
    let existingQuery = supabase
      .from('montree_montage_jobs')
      .select('id, status, title, output_path')
      .eq('school_id', auth.schoolId)
      .eq('scope_type', scopeType)
      .eq('montage_kind', kind)
      .in('status', ['queued', 'rendering'])
      .limit(1);

    if (scopeType === 'child') existingQuery = existingQuery.eq('child_id', childId as string);
    else if (scopeType === 'event') existingQuery = existingQuery.eq('event_id', eventId as string);
    else existingQuery = existingQuery.eq('classroom_id', classroomId as string);

    existingQuery = dateStart ? existingQuery.eq('date_start', dateStart) : existingQuery.is('date_start', null);
    existingQuery = dateEnd ? existingQuery.eq('date_end', dateEnd) : existingQuery.is('date_end', null);

    const { data: existingRows, error: existErr } = await existingQuery;
    if (existErr) {
      if (isMissingSchema(existErr.code)) {
        return NextResponse.json({ error: 'montage system not migrated' }, { status: 503 });
      }
      console.error('[montage] duplicate lookup failed:', existErr.message);
      return NextResponse.json({ error: 'Failed to queue montage' }, { status: 500 });
    }
    const existing = (existingRows || [])[0] as
      | { id: string; status: string; title: string | null; output_path: string | null }
      | undefined;
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
    let query = supabase
      .from('montree_montage_jobs')
      .select(
        'id, scope_type, montage_kind, status, title, output_path, date_start, date_end, created_at, finished_at, error, child_id, event_id, classroom_id'
      )
      .eq('school_id', auth.schoolId)
      .neq('scope_type', 'report')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (auth.classroomId) query = query.eq('classroom_id', auth.classroomId);

    const { data: jobs, error } = await query;
    if (error) {
      if (isMissingSchema(error.code)) {
        return NextResponse.json({ success: true, montages: [] });
      }
      console.error('[montage] GET failed:', error.message);
      return NextResponse.json({ error: 'Failed to fetch montages' }, { status: 500 });
    }

    const rows = (jobs || []) as Array<Record<string, unknown>>;

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
    }));

    return NextResponse.json({ success: true, montages });
  } catch (error) {
    console.error('[montage] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
