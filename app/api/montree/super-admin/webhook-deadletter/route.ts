// /api/montree/super-admin/webhook-deadletter/route.ts
// Read + resolve dead-letter webhook events.
//
// GET   — list pending events (default), optionally filter by status
// PATCH — mark an event as resolved or ignored, with optional notes
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
    const status = searchParams.get('status') || 'pending';
    const eventType = searchParams.get('event_type');

    const supabase = getSupabase();
    let q = supabase
      .from('montree_webhook_deadletter')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (['pending', 'resolved', 'ignored', 'all'].includes(status)) {
      if (status !== 'all') q = q.eq('status', status);
    }
    if (eventType) q = q.eq('event_type', eventType);

    const { data, error } = await q;
    if (error) {
      console.error('[dlq GET]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Counts at a glance.
    const { count: pendingCount } = await supabase
      .from('montree_webhook_deadletter')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    return NextResponse.json({
      rows: data || [],
      pending_count: pendingCount || 0,
    });
  } catch (err) {
    console.error('[dlq GET] unexpected', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

interface PatchBody {
  id: string;
  action: 'mark_resolved' | 'mark_ignored';
  notes?: string;
}

export async function PATCH(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as PatchBody | null;
    if (!body || !body.id || !UUID_RE.test(body.id)) {
      return NextResponse.json({ error: 'Valid id required' }, { status: 400 });
    }
    if (!body.action || !['mark_resolved', 'mark_ignored'].includes(body.action)) {
      return NextResponse.json({ error: 'action required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const newStatus = body.action === 'mark_resolved' ? 'resolved' : 'ignored';
    const { data, error } = await supabase
      .from('montree_webhook_deadletter')
      .update({
        status: newStatus,
        resolved_at: new Date().toISOString(),
        resolved_by: 'super_admin',
        resolved_notes: body.notes || null,
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('[dlq PATCH]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, row: data });
  } catch (err) {
    console.error('[dlq PATCH] unexpected', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
