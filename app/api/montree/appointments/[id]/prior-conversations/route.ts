// app/api/montree/appointments/[id]/prior-conversations/route.ts
//
// THE KILLER-FEATURE ENDPOINT.
//
// Staff opens an upcoming appointment → this endpoint returns the prior
// meetings with the same parent, newest first, with each row's summary.
// Surfaces "what am I walking into" in a single API call.
//
// AUTH: staff host of THIS appointment, OR principal in the school.
// (Parents see their own appointment history via a different endpoint.)
//
// SCOPING: filter by parent_id of THIS appointment. Means a teacher who
// changed classrooms can still see prior meetings with the same parent
// from when the parent's child was in their classroom, but NOT meetings
// with other parents.
//
// LIMITS: returns up to 10 prior meetings. Beyond that the staff should
// just open the parent's profile directly.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { readEncryptedField } from '@/lib/montree/messaging-crypto';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();

  // Pull the appointment to get parent_id + verify the caller's access.
  // Principal sees any appointment in their school; teacher must be a host.
  const apptRes = await supabase
    .from('montree_appointments')
    .select('parent_id, child_id, scheduled_start')
    .eq('id', id)
    .eq('school_id', auth.schoolId)
    .maybeSingle();

  if (!apptRes.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (auth.role === 'teacher') {
    const hostRes = await supabase
      .from('montree_appointment_hosts')
      .select('appointment_id')
      .eq('appointment_id', id)
      .eq('host_role', 'teacher')
      .eq('host_id', auth.userId)
      .maybeSingle();
    if (!hostRes.data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  const parentId = apptRes.data.parent_id as string;
  const currentStart = apptRes.data.scheduled_start as string;

  // Find prior recordings for this parent. We exclude the current
  // appointment AND any future appointments (we only want what's already
  // happened from the staff's POV).
  // 🚨 Session 121 — pull encryption_version so we decrypt summary.
  const { data: recordings, error } = await supabase
    .from('montree_appointment_recordings')
    .select(`
      id,
      appointment_id,
      recording_status,
      summary,
      summary_locale,
      encryption_version,
      summarized_at,
      ended_at,
      montree_appointments!inner(scheduled_start, parent_id, child_id, intake_subject)
    `)
    .eq('school_id', auth.schoolId)
    .eq('recording_status', 'ready')
    .eq('montree_appointments.parent_id', parentId)
    .lt('montree_appointments.scheduled_start', currentStart)
    .not('summary', 'is', null)
    .order('summarized_at', { ascending: false })
    .limit(10);

  if (error) {
    if (error.code === '42P01') {
      // Migration 223 pending → no recordings yet.
      return NextResponse.json({ prior_conversations: [] });
    }
    console.error('[prior-conversations] error', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }

  type PriorRow = {
    id: string;
    appointment_id: string;
    recording_status: string;
    summary: string | null;
    summary_locale: string | null;
    encryption_version: number | null;
    summarized_at: string | null;
    ended_at: string | null;
    montree_appointments: { scheduled_start?: string; intake_subject?: string | null } | { scheduled_start?: string; intake_subject?: string | null }[] | null;
  };

  // Hydrate host names per recording so the UI can show "Last meeting was
  // with Ms. Chen". One join up front because Supabase nested join doesn't
  // resolve the host junction directly.
  const apptIds = (recordings || []).map((r) => (r as PriorRow).appointment_id);
  const { data: hostRows } = apptIds.length
    ? await supabase
        .from('montree_appointment_hosts')
        .select('appointment_id, host_role, host_id, is_primary')
        .in('appointment_id', apptIds)
        .eq('is_primary', true)
    : { data: [] };

  type HostRow = { appointment_id: string; host_role: 'teacher' | 'principal'; host_id: string };
  const teacherIds = new Set<string>();
  const principalIds = new Set<string>();
  for (const h of (hostRows || []) as HostRow[]) {
    if (h.host_role === 'teacher') teacherIds.add(h.host_id);
    else principalIds.add(h.host_id);
  }

  const [tRes, pRes] = await Promise.all([
    teacherIds.size
      ? supabase.from('montree_teachers').select('id, name').in('id', Array.from(teacherIds))
      : Promise.resolve({ data: [] as Array<{ id: string; name: string | null }> }),
    principalIds.size
      ? supabase.from('montree_school_admins').select('id, name').in('id', Array.from(principalIds))
      : Promise.resolve({ data: [] as Array<{ id: string; name: string | null }> }),
  ]);

  const nameByKey = new Map<string, string | null>();
  for (const t of (tRes.data || []) as Array<{ id: string; name: string | null }>) {
    nameByKey.set(`teacher:${t.id}`, t.name);
  }
  for (const p of (pRes.data || []) as Array<{ id: string; name: string | null }>) {
    nameByKey.set(`principal:${p.id}`, p.name);
  }

  const hostByAppt = new Map<string, { role: string; id: string; name: string | null }>();
  for (const h of (hostRows || []) as HostRow[]) {
    hostByAppt.set(h.appointment_id, {
      role: h.host_role,
      id: h.host_id,
      name: nameByKey.get(`${h.host_role}:${h.host_id}`) ?? null,
    });
  }

  const enriched = (recordings || []).map((r) => {
    const rec = r as PriorRow;
    const appt = Array.isArray(rec.montree_appointments)
      ? rec.montree_appointments[0]
      : rec.montree_appointments;
    return {
      recording_id: rec.id,
      appointment_id: rec.appointment_id,
      meeting_date: (appt?.scheduled_start || '').slice(0, 10),
      intake_subject: appt?.intake_subject ?? null,
      // 🚨 Decrypt summary before returning to client.
      summary: rec.summary ? readEncryptedField(rec.summary, rec.encryption_version) : rec.summary,
      summary_locale: rec.summary_locale,
      summarized_at: rec.summarized_at,
      ended_at: rec.ended_at,
      host: hostByAppt.get(rec.appointment_id) || null,
    };
  });

  return NextResponse.json({ prior_conversations: enriched });
}
