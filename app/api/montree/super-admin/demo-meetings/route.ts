import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

// Super-admin demo / meeting tracker (migration 299 → montree_demo_meetings).
// Feeds the 🧭 Command tab's "Demos & meetings" section (Operator Mandate §5½).
//
//   GET   → list all meetings, upcoming (scheduled_at ASC) first then past, ≤100.
//   POST  → create (org_name + scheduled_at required; scheduled_at ISO datetime).
//   PATCH → update by id (any of status / scheduled_at / timezone / outcome_notes /
//           contact fields / dossier_ready).
//
// Uses the service role (bypasses RLS). Auth = verifySuperAdminAuth, same posture
// as the founding route. If the table is missing (migration 299 not run) every
// verb returns a clean 503 with a run-me hint instead of a raw 500.

export const dynamic = 'force-dynamic';

const MIGRATION_299_MSG =
  'The demo tracker needs migration 299 — run it in Supabase first (creates montree_demo_meetings).';

const VALID_STATUS = ['scheduled', 'held', 'cancelled', 'no_show'] as const;

// Postgres "relation does not exist" → the migration hasn't run yet.
function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === '42P01' || (err.message || '').includes('montree_demo_meetings');
}

export async function GET(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getSupabase();
    const nowIso = new Date().toISOString();

    // Upcoming (scheduled_at >= now) ascending — the next demo is first — then
    // past (scheduled_at < now) descending. Two cheap queries, capped 100 total.
    const [upcomingR, pastR] = await Promise.all([
      supabase
        .from('montree_demo_meetings')
        .select('*')
        .gte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: true })
        .limit(100),
      supabase
        .from('montree_demo_meetings')
        .select('*')
        .lt('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: false })
        .limit(100),
    ]);

    if (upcomingR.error) {
      if (isMissingTable(upcomingR.error)) {
        return NextResponse.json({ error: MIGRATION_299_MSG, migration_pending: true }, { status: 503 });
      }
      throw upcomingR.error;
    }
    if (pastR.error) {
      if (isMissingTable(pastR.error)) {
        return NextResponse.json({ error: MIGRATION_299_MSG, migration_pending: true }, { status: 503 });
      }
      throw pastR.error;
    }

    const upcoming = upcomingR.data || [];
    const past = pastR.data || [];
    // Upcoming first, then past, overall cap 100.
    const meetings = [...upcoming, ...past].slice(0, 100);

    return NextResponse.json(
      { meetings, upcoming_count: upcoming.length, past_count: past.length },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[super-admin/demo-meetings GET] failed:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getSupabase();
    const body = await req.json().catch(() => ({}));

    const orgName = String(body?.org_name || '').trim().slice(0, 200);
    const scheduledAtRaw = String(body?.scheduled_at || '').trim();
    if (!orgName) {
      return NextResponse.json({ error: 'org_name is required.' }, { status: 400 });
    }
    const scheduledAt = new Date(scheduledAtRaw);
    if (!scheduledAtRaw || isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: 'A valid scheduled_at datetime is required.' }, { status: 400 });
    }

    const contactName = body?.contact_name ? String(body.contact_name).trim().slice(0, 200) : null;
    const contactEmail = body?.contact_email ? String(body.contact_email).trim().toLowerCase().slice(0, 320) : null;
    const timezone = body?.timezone ? String(body.timezone).trim().slice(0, 100) : 'Asia/Shanghai';
    const sourceContactId = body?.source_contact_id ? String(body.source_contact_id).trim() : null;
    const outcomeNotes = body?.outcome_notes ? String(body.outcome_notes).trim().slice(0, 4000) : null;

    const insert: Record<string, unknown> = {
      org_name: orgName,
      contact_name: contactName,
      contact_email: contactEmail,
      timezone,
      scheduled_at: scheduledAt.toISOString(),
      source_contact_id: sourceContactId,
      outcome_notes: outcomeNotes,
      status: 'scheduled',
    };

    const { data, error } = await supabase
      .from('montree_demo_meetings')
      .insert(insert as never)
      .select('*')
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json({ error: MIGRATION_299_MSG, migration_pending: true }, { status: 503 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, meeting: data });
  } catch (err) {
    console.error('[super-admin/demo-meetings POST] failed:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getSupabase();
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!VALID_STATUS.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
      }
      patch.status = body.status;
    }
    if (body.scheduled_at !== undefined) {
      const d = new Date(String(body.scheduled_at));
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid scheduled_at.' }, { status: 400 });
      }
      patch.scheduled_at = d.toISOString();
    }
    if (body.timezone !== undefined) {
      patch.timezone = String(body.timezone).trim().slice(0, 100);
    }
    if (body.outcome_notes !== undefined) {
      patch.outcome_notes = body.outcome_notes === null ? null : String(body.outcome_notes).slice(0, 4000);
    }
    if (body.contact_name !== undefined) {
      patch.contact_name = body.contact_name === null ? null : String(body.contact_name).trim().slice(0, 200);
    }
    if (body.contact_email !== undefined) {
      patch.contact_email = body.contact_email === null ? null : String(body.contact_email).trim().toLowerCase().slice(0, 320);
    }
    if (body.org_name !== undefined) {
      const org = String(body.org_name).trim().slice(0, 200);
      if (!org) return NextResponse.json({ error: 'org_name cannot be blank.' }, { status: 400 });
      patch.org_name = org;
    }
    if (body.dossier_ready !== undefined) {
      patch.dossier_ready = Boolean(body.dossier_ready);
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('montree_demo_meetings')
      .update(patch as never)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) {
        return NextResponse.json({ error: MIGRATION_299_MSG, migration_pending: true }, { status: 503 });
      }
      throw error;
    }
    if (!data) {
      return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, meeting: data });
  } catch (err) {
    console.error('[super-admin/demo-meetings PATCH] failed:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
