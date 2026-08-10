/**
 * POST /api/montree/super-admin/visitors-mark-internal
 * Retroactively flags every montree_visitors row sharing a given fingerprint
 * as internal traffic (is_internal, migration 324) — or clears the flag.
 *
 * Lets Tredoux, looking at the Live feed in the Visitors tab, mark a cluster
 * of his own past visits (VPN traffic from Oslo/Frankfurt etc.) as internal
 * so they stop polluting the Visitors/Funnel/Geo Match numbers, without
 * needing DB access himself. Complements the forward-looking localStorage
 * device flag in VisitorTracker.tsx, which only covers future visits from a
 * browser that's explicitly been marked — this covers what's already logged.
 *
 * Body: { fingerprint: string, internal?: boolean } (internal defaults true —
 * this endpoint exists mainly to mark rows internal; pass false to undo).
 * Auth: verifySuperAdminAuth (JWT or password header). Super-admin only.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export async function POST(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request.headers);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { fingerprint?: string; internal?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const fingerprint = typeof body.fingerprint === 'string' ? body.fingerprint.trim() : '';
  if (!fingerprint) {
    return NextResponse.json({ error: 'fingerprint required' }, { status: 400 });
  }
  const internal = body.internal !== false; // default true — this action marks internal

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('montree_visitors')
    .update({ is_internal: internal })
    .eq('fingerprint', fingerprint)
    .select('id');

  if (error) {
    if (error.code === '42703') {
      return NextResponse.json(
        { error: 'Migration 324 (is_internal column) has not been run yet — paste it into Supabase first.' },
        { status: 409 }
      );
    }
    console.error('[visitors-mark-internal] update error:', error.code);
    return NextResponse.json({ error: 'Failed to update visitors' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: (data || []).length, internal });
}
