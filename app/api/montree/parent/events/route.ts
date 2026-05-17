// app/api/montree/parent/events/route.ts
//
// GET — list events visible to the parent (school-wide + their child's
// classroom-scoped). Includes the parent's own RSVP per event.
//
// Read-only here. RSVP actions live in the sibling [id]/rsvp route.

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveEventsParent } from '@/lib/montree/events/parent-access';

export const maxDuration = 30;

const COLS =
  'id, school_id, classroom_id, title, description, start_at, end_at, location, capacity, is_published, cancelled_at, cancelled_reason, created_at, updated_at';

export async function GET() {
  const supabase = getSupabase();
  const parent = await resolveEventsParent(supabase);
  if (parent instanceof NextResponse) return parent;

  // Pull events: school-wide + any of parent's classroom-scoped.
  // Range: upcoming + recent past 14 days.
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('montree_school_events')
    .select(COLS)
    .eq('school_id', parent.schoolId)
    .eq('is_published', true)
    .gte('start_at', cutoff)
    .order('start_at', { ascending: true })
    .limit(200);

  // PostgREST .or() with an `in.()` filter needs comma-separated UUIDs.
  if (parent.classroomIds.length > 0) {
    const inList = parent.classroomIds.join(',');
    query = query.or(`classroom_id.is.null,classroom_id.in.(${inList})`);
  } else {
    query = query.is('classroom_id', null);
  }

  const { data: events, error } = await query;
  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ events: [], migration_pending: true });
    }
    console.error('[parent/events GET]', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }

  // Pull parent's own RSVPs for these events.
  const ids = (events || []).map((e: { id: string }) => e.id);
  const myRsvp = new Map<string, { status: string; child_id: string | null; note: string | null }>();
  if (ids.length && parent.parentId) {
    const { data: rsvps } = await supabase
      .from('montree_school_event_rsvps')
      .select('event_id, status, child_id, note')
      .in('event_id', ids)
      .eq('parent_id', parent.parentId);
    type R = { event_id: string; status: string; child_id: string | null; note: string | null };
    for (const r of (rsvps || []) as R[]) {
      myRsvp.set(r.event_id, { status: r.status, child_id: r.child_id, note: r.note });
    }
  }

  // RSVP counts per event (so capacity meters work parent-side too).
  let countsByEvent = new Map<string, { yes: number; no: number; maybe: number }>();
  if (ids.length) {
    const { data: allRsvps } = await supabase
      .from('montree_school_event_rsvps')
      .select('event_id, status')
      .in('event_id', ids);
    type CR = { event_id: string; status: 'yes' | 'no' | 'maybe' };
    countsByEvent = new Map();
    for (const r of (allRsvps || []) as CR[]) {
      const m = countsByEvent.get(r.event_id) || { yes: 0, no: 0, maybe: 0 };
      m[r.status] += 1;
      countsByEvent.set(r.event_id, m);
    }
  }

  const enriched = (events || []).map((e: { id: string }) => ({
    ...e,
    my_rsvp: myRsvp.get(e.id) || null,
    rsvp_counts: countsByEvent.get(e.id) || { yes: 0, no: 0, maybe: 0 },
  }));

  return NextResponse.json({ events: enriched });
}
