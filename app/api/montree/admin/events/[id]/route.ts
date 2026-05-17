// app/api/montree/admin/events/[id]/route.ts
//
// Single event: GET (view + RSVP rollup + per-parent responses),
// PATCH (edit fields, publish toggle, cancel), DELETE (hard delete —
// principal only, mostly for accidental creates).
//
// AUTH: principal — full access. Teacher — only their classroom events.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLS =
  'id, school_id, classroom_id, created_by_role, created_by_id, title, description, start_at, end_at, location, capacity, is_published, cancelled_at, cancelled_reason, created_at, updated_at';

function isStaff(role: string): role is 'teacher' | 'principal' {
  return role === 'teacher' || role === 'principal';
}

async function canAccess(
  supabase: ReturnType<typeof getSupabase>,
  apptId: string,
  auth: { role: 'teacher' | 'principal'; userId: string; schoolId: string; classroomId: string | null }
): Promise<{ ok: true; event: Record<string, unknown> } | { ok: false; status: number; error: string }> {
  const { data: event } = await supabase
    .from('montree_school_events')
    .select(COLS)
    .eq('id', apptId)
    .eq('school_id', auth.schoolId)
    .maybeSingle();
  if (!event) return { ok: false, status: 404, error: 'Not found.' };
  // Teacher can only act on their own classroom events OR school-wide they created.
  if (auth.role === 'teacher') {
    const ev = event as { classroom_id: string | null; created_by_id: string };
    if (ev.classroom_id !== null && ev.classroom_id !== auth.classroomId) {
      return { ok: false, status: 403, error: 'Not your classroom.' };
    }
    if (ev.classroom_id === null && ev.created_by_id !== auth.userId) {
      return { ok: false, status: 403, error: 'Only the principal can edit school-wide events.' };
    }
  }
  return { ok: true, event };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!isStaff(auth.role)) {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }
  const supabase = getSupabase();
  const access = await canAccess(supabase, id, auth);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  // Hydrate RSVPs with parent names.
  const { data: rsvps } = await supabase
    .from('montree_school_event_rsvps')
    .select('event_id, parent_id, status, child_id, note, responded_at, updated_at')
    .eq('event_id', id);

  type RsvpRow = { event_id: string; parent_id: string; status: 'yes' | 'no' | 'maybe'; child_id: string | null; note: string | null; responded_at: string; updated_at: string };
  const rsvpRows = (rsvps || []) as RsvpRow[];

  const parentIds = Array.from(new Set(rsvpRows.map((r) => r.parent_id)));
  let parentName = new Map<string, string>();
  if (parentIds.length > 0) {
    const { data: parentsRows } = await supabase
      .from('montree_parents')
      .select('id, name, email')
      .in('id', parentIds);
    type ParentRow = { id: string; name: string | null; email: string };
    parentName = new Map(((parentsRows || []) as ParentRow[]).map((p) => [p.id, p.name || p.email]));
  }

  const hydratedRsvps = rsvpRows.map((r) => ({
    ...r,
    parent_name: parentName.get(r.parent_id) || null,
  }));

  const counts = { yes: 0, no: 0, maybe: 0 };
  for (const r of rsvpRows) counts[r.status] += 1;

  return NextResponse.json({
    event: access.event,
    rsvps: hydratedRsvps,
    counts,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!isStaff(auth.role)) {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }
  const supabase = getSupabase();
  const access = await canAccess(supabase, id, auth);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: {
    title?: string;
    description?: string;
    start_at?: string;
    end_at?: string | null;
    location?: string | null;
    capacity?: number | null;
    is_published?: boolean;
    cancel?: { reason?: string };
    uncancel?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) {
    if (!body.title.trim()) {
      return NextResponse.json({ error: 'title cannot be empty.' }, { status: 400 });
    }
    updates.title = body.title.slice(0, 200).trim();
  }
  if (body.description !== undefined) {
    updates.description = body.description ? body.description.slice(0, 5000) : null;
  }
  if (body.start_at !== undefined) {
    const ms = Date.parse(body.start_at);
    if (Number.isNaN(ms)) {
      return NextResponse.json({ error: 'start_at invalid.' }, { status: 400 });
    }
    updates.start_at = new Date(ms).toISOString();
  }
  if (body.end_at !== undefined) {
    if (body.end_at === null) updates.end_at = null;
    else {
      const ms = Date.parse(body.end_at);
      if (Number.isNaN(ms)) {
        return NextResponse.json({ error: 'end_at invalid.' }, { status: 400 });
      }
      updates.end_at = new Date(ms).toISOString();
    }
  }
  if (body.location !== undefined) {
    updates.location = body.location ? body.location.slice(0, 500) : null;
  }
  if (body.capacity !== undefined) {
    if (body.capacity === null) updates.capacity = null;
    else if (Number.isFinite(body.capacity) && body.capacity >= 0) updates.capacity = body.capacity;
    else return NextResponse.json({ error: 'capacity invalid.' }, { status: 400 });
  }
  if (typeof body.is_published === 'boolean') updates.is_published = body.is_published;
  if (body.cancel) {
    updates.cancelled_at = new Date().toISOString();
    updates.cancelled_reason = body.cancel.reason?.slice(0, 500) || null;
  }
  if (body.uncancel === true) {
    updates.cancelled_at = null;
    updates.cancelled_reason = null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No editable fields.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('montree_school_events')
    .update(updates)
    .eq('id', id)
    .eq('school_id', auth.schoolId)
    .select(COLS)
    .maybeSingle();

  if (error || !data) {
    console.error('[admin/events PATCH]', error);
    return NextResponse.json({ error: 'Failed to update.' }, { status: 500 });
  }
  return NextResponse.json({ event: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  // Hard delete is principal-only — preserves teacher audit trail.
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only the principal can delete events. Teachers can cancel instead.' },
      { status: 403 }
    );
  }
  const supabase = getSupabase();
  const { error } = await supabase
    .from('montree_school_events')
    .delete()
    .eq('id', id)
    .eq('school_id', auth.schoolId);
  if (error) {
    console.error('[admin/events DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
