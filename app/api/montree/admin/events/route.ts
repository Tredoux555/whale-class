// app/api/montree/admin/events/route.ts
//
// Staff-side event CRUD (principal + teacher). Principals can create
// school-wide events. Teachers can create classroom-scoped events for
// their own classroom only.
//
// GET  — list events the caller can see + RSVP rollup per event.
// POST — create an event.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { isFeatureEnabled } from '@/lib/montree/features/server';

export const maxDuration = 30;

const COLS =
  'id, school_id, classroom_id, created_by_role, created_by_id, title, description, start_at, end_at, location, capacity, is_published, cancelled_at, cancelled_reason, created_at, updated_at';

function isStaff(role: string): role is 'teacher' | 'principal' {
  return role === 'teacher' || role === 'principal';
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!isStaff(auth.role)) {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const enabled = await isFeatureEnabled(supabase, auth.schoolId, 'school_events');
  if (!enabled) {
    return NextResponse.json({ events: [], feature_disabled: true });
  }

  // Scope: principal sees every school-wide + every classroom event.
  // Teacher sees school-wide events + events for THEIR classroom.
  let query = supabase
    .from('montree_school_events')
    .select(COLS)
    .eq('school_id', auth.schoolId)
    .order('start_at', { ascending: true })
    .limit(200);

  if (auth.role === 'teacher' && auth.classroomId) {
    query = query.or(
      `classroom_id.is.null,classroom_id.eq.${auth.classroomId}`
    );
  }

  const { data: events, error } = await query;
  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ events: [], migration_pending: true });
    }
    console.error('[admin/events GET]', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }

  // RSVP rollups in one go.
  const ids = (events || []).map((e: { id: string }) => e.id);
  let rsvpsByEvent = new Map<string, { yes: number; no: number; maybe: number }>();
  if (ids.length) {
    const { data: rsvps } = await supabase
      .from('montree_school_event_rsvps')
      .select('event_id, status')
      .in('event_id', ids);
    type RsvpRow = { event_id: string; status: 'yes' | 'no' | 'maybe' };
    rsvpsByEvent = new Map();
    for (const r of (rsvps || []) as RsvpRow[]) {
      const m = rsvpsByEvent.get(r.event_id) || { yes: 0, no: 0, maybe: 0 };
      m[r.status] += 1;
      rsvpsByEvent.set(r.event_id, m);
    }
  }

  const enriched = (events || []).map((e: { id: string }) => ({
    ...e,
    rsvps: rsvpsByEvent.get(e.id) || { yes: 0, no: 0, maybe: 0 },
  }));

  return NextResponse.json({ events: enriched });
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!isStaff(auth.role)) {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const enabled = await isFeatureEnabled(supabase, auth.schoolId, 'school_events');
  if (!enabled) {
    return NextResponse.json({ error: 'school_events not enabled.' }, { status: 403 });
  }

  let body: {
    title?: string;
    description?: string;
    start_at?: string;
    end_at?: string;
    location?: string;
    capacity?: number;
    classroom_id?: string | null;
    is_published?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: 'title required.' }, { status: 400 });
  }
  const startMs = body.start_at ? Date.parse(body.start_at) : NaN;
  if (Number.isNaN(startMs)) {
    return NextResponse.json({ error: 'start_at required (ISO).' }, { status: 400 });
  }
  const endMs = body.end_at ? Date.parse(body.end_at) : NaN;
  if (body.end_at && (Number.isNaN(endMs) || endMs <= startMs)) {
    return NextResponse.json({ error: 'end_at must be after start_at.' }, { status: 400 });
  }
  if (body.capacity !== undefined && body.capacity !== null && (!Number.isFinite(body.capacity) || body.capacity < 0)) {
    return NextResponse.json({ error: 'capacity must be a non-negative number.' }, { status: 400 });
  }

  // Classroom scope authorization.
  let classroomId: string | null = body.classroom_id ?? null;
  if (auth.role === 'teacher') {
    // Teacher MUST scope to their own classroom (or skip and we auto-fill).
    if (classroomId && classroomId !== auth.classroomId) {
      return NextResponse.json(
        { error: 'Teachers can only create events for their own classroom.' },
        { status: 403 }
      );
    }
    classroomId = auth.classroomId || null;
    if (!classroomId) {
      return NextResponse.json(
        { error: 'You must be assigned a classroom to create events.' },
        { status: 403 }
      );
    }
  } else if (classroomId) {
    // Principal — verify classroom is in their school.
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', classroomId)
      .maybeSingle();
    if (!classroom || classroom.school_id !== auth.schoolId) {
      return NextResponse.json(
        { error: 'Classroom not in your school.' },
        { status: 403 }
      );
    }
  }

  const { data, error } = await supabase
    .from('montree_school_events')
    .insert({
      school_id: auth.schoolId,
      classroom_id: classroomId,
      created_by_role: auth.role,
      created_by_id: auth.userId,
      title: body.title.slice(0, 200).trim(),
      description: body.description?.slice(0, 5000) || null,
      start_at: new Date(startMs).toISOString(),
      end_at: body.end_at ? new Date(endMs).toISOString() : null,
      location: body.location?.slice(0, 500) || null,
      capacity: body.capacity ?? null,
      is_published: body.is_published !== false,
    })
    .select(COLS)
    .single();

  if (error || !data) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Migration 218 not yet run.', migration_pending: true },
        { status: 503 }
      );
    }
    console.error('[admin/events POST]', error);
    return NextResponse.json({ error: 'Failed to create event.' }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}
