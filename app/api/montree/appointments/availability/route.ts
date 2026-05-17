// app/api/montree/appointments/availability/route.ts
//
// Staff self-service availability editor. Used by teachers AT
// /montree/dashboard/availability AND principals at
// /montree/admin/availability.
//
// AUTH: teacher OR principal. The auth.role determines which `staff_role`
// column we write. parent + agent are rejected.
//
// CROSS-POLLINATION: every row written or read scopes by
//   (staff_role = auth.role, staff_id = auth.userId, school_id = auth.schoolId)
// — three-key filter. A teacher cannot read another teacher's rules; a
// principal cannot read a teacher's rules through this endpoint (the
// principal's school-wide view of teacher availability comes via the
// per-staff slots endpoint).

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { isFeatureEnabled } from '@/lib/montree/features/server';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RULE_COLS =
  'id, staff_role, staff_id, school_id, day_of_week, start_time, end_time, slot_duration_minutes, buffer_minutes, timezone, is_active, created_at, updated_at';

const BLACKOUT_COLS =
  'id, staff_role, staff_id, school_id, start_at, end_at, reason, created_at';

function isStaff(role: string): role is 'teacher' | 'principal' {
  return role === 'teacher' || role === 'principal';
}

// ── GET — return this staff member's own rules + blackouts ───────────
export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!isStaff(auth.role)) {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();

  // Feature gate. We surface a clean "feature_disabled" response rather
  // than 404 because staff need to know WHY the page is empty. The UI
  // shows an "Appointments isn't enabled for your school yet" hint.
  const enabled = await isFeatureEnabled(supabase, auth.schoolId, 'appointments');
  if (!enabled) {
    return NextResponse.json({
      feature_disabled: true,
      rules: [],
      blackouts: [],
    });
  }

  const [rulesRes, blackoutsRes] = await Promise.all([
    supabase
      .from('montree_availability_rules')
      .select(RULE_COLS)
      .eq('staff_role', auth.role)
      .eq('staff_id', auth.userId)
      .eq('school_id', auth.schoolId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true }),
    supabase
      .from('montree_availability_blackouts')
      .select(BLACKOUT_COLS)
      .eq('staff_role', auth.role)
      .eq('staff_id', auth.userId)
      .eq('school_id', auth.schoolId)
      .gte('end_at', new Date().toISOString())
      .order('start_at', { ascending: true })
      .limit(200),
  ]);

  if (rulesRes.error) {
    // 42P01 — table doesn't exist (migration 216 not run).
    if (rulesRes.error.code === '42P01') {
      return NextResponse.json({
        migration_pending: true,
        rules: [],
        blackouts: [],
        message: 'Migration 216 not yet run.',
      });
    }
    console.error('[availability GET] rules error', rulesRes.error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
  if (blackoutsRes.error && blackoutsRes.error.code !== '42P01') {
    console.error('[availability GET] blackouts error', blackoutsRes.error);
  }

  return NextResponse.json({
    rules: rulesRes.data || [],
    blackouts: blackoutsRes.data || [],
  });
}

// ── POST — create a new recurring availability rule ──────────────────
export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!isStaff(auth.role)) {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const enabled = await isFeatureEnabled(supabase, auth.schoolId, 'appointments');
  if (!enabled) {
    return NextResponse.json(
      { error: 'Appointments feature is not enabled for this school.' },
      { status: 403 }
    );
  }

  let body: {
    day_of_week?: number;
    start_time?: string;
    end_time?: string;
    slot_duration_minutes?: number;
    buffer_minutes?: number;
    timezone?: string;
    is_active?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // Validation.
  if (
    typeof body.day_of_week !== 'number' ||
    body.day_of_week < 0 ||
    body.day_of_week > 6
  ) {
    return NextResponse.json(
      { error: 'day_of_week must be 0-6.' },
      { status: 400 }
    );
  }
  if (!body.start_time || !body.end_time) {
    return NextResponse.json(
      { error: 'start_time and end_time are required (HH:MM or HH:MM:SS).' },
      { status: 400 }
    );
  }
  if (!isValidTime(body.start_time) || !isValidTime(body.end_time)) {
    return NextResponse.json(
      { error: 'start_time / end_time must be HH:MM or HH:MM:SS.' },
      { status: 400 }
    );
  }
  if (toSeconds(body.end_time) <= toSeconds(body.start_time)) {
    return NextResponse.json(
      { error: 'end_time must be after start_time.' },
      { status: 400 }
    );
  }
  const slotDur = body.slot_duration_minutes ?? 30;
  if (slotDur < 5 || slotDur > 240) {
    return NextResponse.json(
      { error: 'slot_duration_minutes must be 5-240.' },
      { status: 400 }
    );
  }
  const buffer = body.buffer_minutes ?? 5;
  if (buffer < 0 || buffer > 60) {
    return NextResponse.json(
      { error: 'buffer_minutes must be 0-60.' },
      { status: 400 }
    );
  }
  const tz = (body.timezone || 'UTC').slice(0, 64);

  const { data, error } = await supabase
    .from('montree_availability_rules')
    .insert({
      staff_role: auth.role,
      staff_id: auth.userId,
      school_id: auth.schoolId,
      day_of_week: body.day_of_week,
      start_time: body.start_time,
      end_time: body.end_time,
      slot_duration_minutes: slotDur,
      buffer_minutes: buffer,
      timezone: tz,
      is_active: body.is_active !== false,
    })
    .select(RULE_COLS)
    .single();

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json(
        { error: 'Migration 216 not yet run.', migration_pending: true },
        { status: 503 }
      );
    }
    console.error('[availability POST] error', error);
    return NextResponse.json({ error: 'Failed to create rule.' }, { status: 500 });
  }

  return NextResponse.json({ rule: data });
}

// ── PATCH — update an existing rule ──────────────────────────────────
export async function PATCH(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (!isStaff(auth.role)) {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  let body: {
    id?: string;
    day_of_week?: number;
    start_time?: string;
    end_time?: string;
    slot_duration_minutes?: number;
    buffer_minutes?: number;
    timezone?: string;
    is_active?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.id || !UUID_RE.test(body.id)) {
    return NextResponse.json({ error: 'id (UUID) required.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.day_of_week === 'number') {
    if (body.day_of_week < 0 || body.day_of_week > 6) {
      return NextResponse.json({ error: 'day_of_week must be 0-6.' }, { status: 400 });
    }
    updates.day_of_week = body.day_of_week;
  }
  if (body.start_time) {
    if (!isValidTime(body.start_time)) {
      return NextResponse.json({ error: 'start_time invalid.' }, { status: 400 });
    }
    updates.start_time = body.start_time;
  }
  if (body.end_time) {
    if (!isValidTime(body.end_time)) {
      return NextResponse.json({ error: 'end_time invalid.' }, { status: 400 });
    }
    updates.end_time = body.end_time;
  }
  if (typeof body.slot_duration_minutes === 'number') {
    if (body.slot_duration_minutes < 5 || body.slot_duration_minutes > 240) {
      return NextResponse.json({ error: 'slot_duration_minutes 5-240.' }, { status: 400 });
    }
    updates.slot_duration_minutes = body.slot_duration_minutes;
  }
  if (typeof body.buffer_minutes === 'number') {
    if (body.buffer_minutes < 0 || body.buffer_minutes > 60) {
      return NextResponse.json({ error: 'buffer_minutes 0-60.' }, { status: 400 });
    }
    updates.buffer_minutes = body.buffer_minutes;
  }
  if (typeof body.timezone === 'string') {
    updates.timezone = body.timezone.slice(0, 64);
  }
  if (typeof body.is_active === 'boolean') {
    updates.is_active = body.is_active;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No editable fields.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('montree_availability_rules')
    .update(updates)
    .eq('id', body.id)
    .eq('staff_role', auth.role)
    .eq('staff_id', auth.userId)
    .eq('school_id', auth.schoolId)
    .select(RULE_COLS)
    .maybeSingle();

  if (error) {
    console.error('[availability PATCH] error', error);
    return NextResponse.json({ error: 'Failed to update.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
  return NextResponse.json({ rule: data });
}

// ── DELETE — drop a rule ─────────────────────────────────────────────
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
    .from('montree_availability_rules')
    .delete()
    .eq('id', id)
    .eq('staff_role', auth.role)
    .eq('staff_id', auth.userId)
    .eq('school_id', auth.schoolId);

  if (error) {
    console.error('[availability DELETE] error', error);
    return NextResponse.json({ error: 'Failed to delete.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// ── helpers ──────────────────────────────────────────────────────────
function isValidTime(s: string): boolean {
  return /^([0-1]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(s);
}
function toSeconds(s: string): number {
  const [h, m, sec = '0'] = s.split(':');
  return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(sec, 10);
}
