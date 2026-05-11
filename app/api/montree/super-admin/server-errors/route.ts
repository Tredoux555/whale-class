// /api/montree/super-admin/server-errors/route.ts
// GET — list recent errors (filter by resolved/unresolved/origin/severity)
// PATCH — mark resolved with notes
// DELETE — purge by id (rare, for noise / duplicates)
//
// Auth: super-admin only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const stateFilter = searchParams.get('state') || 'unresolved'; // unresolved | resolved | all
    const origin = searchParams.get('origin');
    const severity = searchParams.get('severity');

    const supabase = getSupabase();
    let q = supabase
      .from('montree_server_errors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (stateFilter === 'unresolved') q = q.is('resolved_at', null);
    if (stateFilter === 'resolved') q = q.not('resolved_at', 'is', null);
    if (origin) q = q.eq('origin', origin);
    if (severity && ['warn', 'error', 'fatal'].includes(severity)) q = q.eq('severity', severity);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Counts at a glance.
    const { count: unresolvedCount } = await supabase
      .from('montree_server_errors')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null);

    // Per-origin breakdown of the rows currently shown.
    const originCounts: Record<string, number> = {};
    for (const r of (data || []) as Array<{ origin: string }>) {
      originCounts[r.origin] = (originCounts[r.origin] || 0) + 1;
    }

    return NextResponse.json({
      rows: data || [],
      unresolved_count: unresolvedCount || 0,
      origin_counts: originCounts,
    });
  } catch (err) {
    console.error('[server-errors GET]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

interface PatchBody {
  id: string;
  resolved_notes?: string;
}

export async function PATCH(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as PatchBody | null;
    if (!body || !body.id || !UUID_RE.test(body.id)) {
      return NextResponse.json({ error: 'Valid id required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('montree_server_errors')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: 'super_admin',
        resolved_notes: body.resolved_notes || null,
      })
      .eq('id', body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[server-errors PATCH]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id || !UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Valid id required' }, { status: 400 });
    }
    const supabase = getSupabase();
    const { error } = await supabase.from('montree_server_errors').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[server-errors DELETE]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
