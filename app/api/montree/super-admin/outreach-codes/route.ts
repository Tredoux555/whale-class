// app/api/montree/super-admin/outreach-codes/route.ts
// Super-admin view of the outreach code system (China cold-email campaign).
// Backing table: montree_outreach_schools (migration 279; seed 279b).
//
// GET   — full list + per-status counts. Cache: no-store (live surface).
// PATCH — { id, action: 'mark_emailed' } stamps emailed_at + promotes
//         'not_contacted' → 'emailed' (never downgrades visited/registered).
//
// Auth: super-admin only. All access via the service-role client (the table
// is RLS deny-all for anon/authenticated by design).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export async function GET(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const { data: rows, error } = await supabase
    .from('montree_outreach_schools')
    .select(
      'id, outreach_code, school_name, city, network, list_tier, status, visit_count, first_visited_at, emailed_at, registered_at, registered_school_id, contact_email, contact_name, notes'
    )
    .order('outreach_code', { ascending: true });

  if (error) {
    // Migration 279 not run yet (42P01) → tell the UI instead of a bare 500.
    const migrationPending = error.code === '42P01';
    return NextResponse.json(
      { error: error.message, migration_pending: migrationPending },
      { status: migrationPending ? 200 : 500 }
    );
  }

  const list = rows || [];
  const counts = {
    total: list.length,
    not_contacted: list.filter((r) => r.status === 'not_contacted').length,
    emailed: list.filter((r) => r.status === 'emailed').length,
    visited: list.filter((r) => r.status === 'visited').length,
    registered: list.filter((r) => r.status === 'registered').length,
    total_visits: list.reduce((sum, r) => sum + (r.visit_count || 0), 0),
  };

  return NextResponse.json(
    { rows: list, counts },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

export async function PATCH(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, action } = await req.json().catch(() => ({}));
  if (!id || action !== 'mark_emailed') {
    return NextResponse.json({ error: 'id and action=mark_emailed required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: row, error: readError } = await supabase
    .from('montree_outreach_schools')
    .select('id, status')
    .eq('id', id)
    .maybeSingle();

  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'Outreach row not found' }, { status: 404 });

  // Stamp emailed_at always; only promote status when it wouldn't lose
  // stronger signal (visited/registered stay as they are).
  const update: Record<string, unknown> = { emailed_at: new Date().toISOString() };
  if (row.status === 'not_contacted') update.status = 'emailed';

  const { error: updateError } = await supabase
    .from('montree_outreach_schools')
    .update(update)
    .eq('id', id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
