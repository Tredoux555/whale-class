// app/api/montree/appointments/route.ts
//
// Staff-side appointment list. Scope depends on auth.role:
//   teacher   — appointments where THEY are a host.
//   principal — every appointment in their school (transparency rule).
//
// Read-only here. Staff actions on individual appointments live in
// the sibling [id] route.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import type { StaffRole } from '@/lib/montree/appointments/types';

export const maxDuration = 30;

// Includes optional columns from 222 (video_url) + 223 (provider,
// recording_enabled). LEGACY fallback strips all three.
const APPT_COLS =
  'id, school_id, classroom_id, child_id, parent_id, event_kind, scheduled_start, scheduled_end, duration_minutes, status, cancelled_reason, cancelled_by_role, cancelled_at, intake_subject, intake_body, location, thread_id, video_url, provider, recording_enabled, created_at, updated_at';
const APPT_COLS_LEGACY =
  'id, school_id, classroom_id, child_id, parent_id, event_kind, scheduled_start, scheduled_end, duration_minutes, status, cancelled_reason, cancelled_by_role, cancelled_at, intake_subject, intake_body, location, thread_id, created_at, updated_at';

function isVideoUrlColumnMissing(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === '42703' && /video_url|provider|recording_enabled/i.test(err.message || '');
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const enabled = await isFeatureEnabled(supabase, auth.schoolId, 'appointments');
  if (!enabled) {
    return NextResponse.json({ appointments: [], feature_disabled: true });
  }

  const { searchParams } = new URL(request.url);
  const includePast = searchParams.get('include_past') === '1';
  const cutoffIso = includePast
    ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // ── Pull the appointment IDs the caller can see ────────────────────
  let apptIds: string[] = [];
  if (auth.role === 'principal') {
    // Principal sees every appointment in their school.
    const { data, error } = await supabase
      .from('montree_appointments')
      .select('id')
      .eq('school_id', auth.schoolId)
      .gte('scheduled_start', cutoffIso)
      .order('scheduled_start', { ascending: true })
      .limit(500);
    if (error && error.code === '42P01') {
      return NextResponse.json({
        appointments: [],
        migration_pending: true,
      });
    }
    if (error) {
      console.error('[appointments GET principal] error', error);
      return NextResponse.json({ error: 'Server error.' }, { status: 500 });
    }
    apptIds = (data || []).map((r: { id: string }) => r.id);
  } else {
    // Teacher — appointments where they're a host.
    const { data: hostRows, error } = await supabase
      .from('montree_appointment_hosts')
      .select('appointment_id')
      .eq('host_role', auth.role)
      .eq('host_id', auth.userId);
    if (error && error.code === '42P01') {
      return NextResponse.json({
        appointments: [],
        migration_pending: true,
      });
    }
    if (error) {
      console.error('[appointments GET teacher] hosts query', error);
      return NextResponse.json({ error: 'Server error.' }, { status: 500 });
    }
    apptIds = (hostRows || []).map((r: { appointment_id: string }) => r.appointment_id);
  }

  if (apptIds.length === 0) {
    return NextResponse.json({ appointments: [] });
  }

  // ── Hydrate appointment rows + hosts + parent names ────────────────
  const buildApptsHydrate = (cols: string) =>
    supabase
      .from('montree_appointments')
      .select(cols)
      .in('id', apptIds)
      .eq('school_id', auth.schoolId)
      .gte('scheduled_start', cutoffIso)
      .order('scheduled_start', { ascending: true });

  const [apptsResAttempt, hostsRes] = await Promise.all([
    buildApptsHydrate(APPT_COLS),
    supabase
      .from('montree_appointment_hosts')
      .select('appointment_id, host_role, host_id, is_primary, is_required, response')
      .in('appointment_id', apptIds),
  ]);
  let apptsRes = apptsResAttempt;
  if (isVideoUrlColumnMissing(apptsRes.error)) {
    console.warn('[appointments GET] video_url column missing — migration 222 pending');
    apptsRes = await buildApptsHydrate(APPT_COLS_LEGACY);
  }
  if (apptsRes.error) {
    console.error('[appointments GET] hydrate error', apptsRes.error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
  const appts = apptsRes.data || [];

  // Hydrate parent + child + host names.
  const parentIds = new Set<string>();
  const childIds = new Set<string>();
  type ApptRow = { id: string; parent_id: string; child_id: string | null };
  for (const a of appts as ApptRow[]) {
    parentIds.add(a.parent_id);
    if (a.child_id) childIds.add(a.child_id);
  }
  const teacherIds = new Set<string>();
  const principalIds = new Set<string>();
  type HostRow = { appointment_id: string; host_role: StaffRole; host_id: string; is_primary: boolean; is_required: boolean; response: string | null };
  for (const h of (hostsRes.data || []) as HostRow[]) {
    if (h.host_role === 'teacher') teacherIds.add(h.host_id);
    else principalIds.add(h.host_id);
  }

  const [parentsRes, childrenRes, teachersRes, principalsRes] = await Promise.all([
    parentIds.size
      ? supabase.from('montree_parents').select('id, name, email').in('id', Array.from(parentIds))
      : Promise.resolve({ data: [] }),
    childIds.size
      ? supabase.from('montree_children').select('id, name').in('id', Array.from(childIds))
      : Promise.resolve({ data: [] }),
    teacherIds.size
      ? supabase.from('montree_teachers').select('id, name').in('id', Array.from(teacherIds))
      : Promise.resolve({ data: [] }),
    principalIds.size
      ? supabase.from('montree_school_admins').select('id, name').in('id', Array.from(principalIds))
      : Promise.resolve({ data: [] }),
  ]);

  const parentName = new Map<string, string>();
  for (const p of (parentsRes.data || []) as Array<{ id: string; name: string | null; email: string }>)
    parentName.set(p.id, p.name || p.email);
  const childName = new Map<string, string>();
  for (const c of (childrenRes.data || []) as Array<{ id: string; name: string }>)
    childName.set(c.id, c.name);
  const hostName = new Map<string, string | null>();
  for (const t of (teachersRes.data || []) as Array<{ id: string; name: string | null }>)
    hostName.set(`teacher:${t.id}`, t.name);
  for (const p of (principalsRes.data || []) as Array<{ id: string; name: string | null }>)
    hostName.set(`principal:${p.id}`, p.name);

  const hostsByAppt = new Map<string, Array<{ role: StaffRole; id: string; name: string | null; is_primary: boolean; is_required: boolean; response: string | null }>>();
  for (const h of (hostsRes.data || []) as HostRow[]) {
    const arr = hostsByAppt.get(h.appointment_id) || [];
    arr.push({
      role: h.host_role,
      id: h.host_id,
      name: hostName.get(`${h.host_role}:${h.host_id}`) ?? null,
      is_primary: h.is_primary,
      is_required: h.is_required,
      response: h.response,
    });
    hostsByAppt.set(h.appointment_id, arr);
  }

  type ApptOut = ApptRow & { parent_name: string | null; child_name: string | null; hosts: Array<{ role: StaffRole; id: string; name: string | null; is_primary: boolean; is_required: boolean; response: string | null }> };
  const enriched: ApptOut[] = (appts as ApptRow[]).map((a) => ({
    ...a,
    parent_name: parentName.get(a.parent_id) ?? null,
    child_name: a.child_id ? (childName.get(a.child_id) ?? null) : null,
    hosts: hostsByAppt.get(a.id) || [],
  }));

  return NextResponse.json({ appointments: enriched });
}
