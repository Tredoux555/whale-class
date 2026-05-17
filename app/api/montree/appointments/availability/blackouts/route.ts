// app/api/montree/appointments/availability/blackouts/route.ts
//
// Staff self-service one-off blackouts (vacation, sick day, school
// closure). The recurring rules live in the sibling /availability route.
//
// AUTH: teacher OR principal — self-scoped.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { isFeatureEnabled } from '@/lib/montree/features/server';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLS = 'id, staff_role, staff_id, school_id, start_at, end_at, reason, created_at';

function isStaff(role: string): role is 'teacher' | 'principal' {
  return role === 'teacher' || role === 'principal';
}

// ── POST — create a blackout window ──────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!isStaff(auth.role)) {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const enabled = await isFeatureEnabled(supabase, auth.schoolId, 'appointments');
  if (!enabled) {
    return NextResponse.json({ error: 'Appointments not enabled.' }, { status: 403 });
  }

  let body: { start_at?: string; end_at?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.start_at || !body.end_at) {
    return NextResponse.json(
      { error: 'start_at and end_at required (ISO).' },
      { status: 400 }
    );
  }
  const startMs = Date.parse(body.start_at);
  const endMs = Date.parse(body.end_at);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return NextResponse.json({ error: 'Invalid ISO timestamps.' }, { status: 400 });
  }
  if (endMs <= startMs) {
    return NextResponse.json({ error: 'end_at must be after start_at.' }, { status: 400 });
  }
  // Hard cap: no blackout longer than 365 days.
  if (endMs - startMs > 365 * 24 * 60 * 60 * 1000) {
    return NextResponse.json(
      { error: 'Blackout cannot exceed 365 days.' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('montree_availability_blackouts')
    .insert({
      staff_role: auth.role,
      staff_id: auth.userId,
      school_id: auth.schoolId,
      start_at: new Date(startMs).toISOString(),
      end_at: new Date(endMs).toISOString(),
      reason: body.reason ? body.reason.slice(0, 500) : null,
    })
    .select(COLS)
    .single();

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json(
        { error: 'Migration 216 not yet run.', migration_pending: true },
        { status: 503 }
      );
    }
    console.error('[blackouts POST] error', error);
    return NextResponse.json({ error: 'Failed to create blackout.' }, { status: 500 });
  }

  return NextResponse.json({ blackout: data });
}

// ── DELETE — remove a blackout ───────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!isStaff(auth.role)) {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'id (UUID) required.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('montree_availability_blackouts')
    .delete()
    .eq('id', id)
    .eq('staff_role', auth.role)
    .eq('staff_id', auth.userId)
    .eq('school_id', auth.schoolId);

  if (error) {
    console.error('[blackouts DELETE] error', error);
    return NextResponse.json({ error: 'Failed to delete.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
