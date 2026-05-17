// app/api/montree/parent/events/[id]/rsvp/route.ts
//
// Parent RSVP write. POST creates or updates the RSVP (upsert via the
// composite PRIMARY KEY (event_id, parent_id)).
//
// Invite-only sessions are REJECTED (no parentId to RSVP with).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveEventsParent } from '@/lib/montree/events/parent-access';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }
  const supabase = getSupabase();
  const parent = await resolveEventsParent(supabase);
  if (parent instanceof NextResponse) return parent;
  if (!parent.parentId) {
    return NextResponse.json(
      { error: 'RSVP requires a parent account (not invite-only access).' },
      { status: 403 }
    );
  }

  let body: { status?: 'yes' | 'no' | 'maybe'; child_id?: string | null; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  if (!body.status || !['yes', 'no', 'maybe'].includes(body.status)) {
    return NextResponse.json({ error: 'status must be yes|no|maybe.' }, { status: 400 });
  }

  // Verify the event is visible to this parent (same scope rule as GET).
  const { data: event } = await supabase
    .from('montree_school_events')
    .select('id, school_id, classroom_id, is_published, cancelled_at')
    .eq('id', id)
    .eq('school_id', parent.schoolId)
    .maybeSingle();
  if (!event || !event.is_published || event.cancelled_at) {
    return NextResponse.json({ error: 'Event not available.' }, { status: 404 });
  }
  if (event.classroom_id && !parent.classroomIds.includes(event.classroom_id)) {
    return NextResponse.json({ error: 'Not your classroom event.' }, { status: 403 });
  }

  // Child verification when supplied.
  let childId: string | null = null;
  if (body.child_id) {
    if (!UUID_RE.test(body.child_id) || !parent.childIds.includes(body.child_id)) {
      return NextResponse.json({ error: 'child_id must be your own.' }, { status: 403 });
    }
    childId = body.child_id;
  }

  const { data, error } = await supabase
    .from('montree_school_event_rsvps')
    .upsert(
      {
        event_id: id,
        parent_id: parent.parentId,
        status: body.status,
        child_id: childId,
        note: body.note ? body.note.slice(0, 500) : null,
      },
      { onConflict: 'event_id,parent_id' }
    )
    .select('event_id, parent_id, status, child_id, note, responded_at, updated_at')
    .maybeSingle();

  if (error || !data) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Migration 218 not yet run.', migration_pending: true },
        { status: 503 }
      );
    }
    console.error('[parent/events RSVP]', error);
    return NextResponse.json({ error: 'Failed to save RSVP.' }, { status: 500 });
  }

  return NextResponse.json({ rsvp: data });
}
