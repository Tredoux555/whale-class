// /api/montree/super-admin/agent-audit/route.ts
//
// Phase 7a, Q3 — Tredoux opted to LOG agent activity instead of getting
// pinged on every event. This endpoint surfaces the audit log so the super
// admin Referrals tab can render a "Recent agent activity" panel.
//
// GET — paginated list of recent agent audit rows. Most recent first.
//       Query params:
//         limit       (default 50, max 200)
//         offset      (default 0)
//         agent_id    (optional filter)
//         event_type  (optional filter)
//
// Super-admin only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';

const SELECT = 'id, agent_id, agent_display_name, agent_email, event_type, actor_role, details, ip_address, created_at';

export async function GET(req: NextRequest) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get('limit') || '50');
  const offsetParam = Number(searchParams.get('offset') || '0');
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 50, 1), 200);
  const offset = Math.max(Number.isFinite(offsetParam) ? offsetParam : 0, 0);
  const agentId = searchParams.get('agent_id');
  const eventType = searchParams.get('event_type');

  const supabase = getSupabase();

  let query = supabase
    .from('montree_agent_audit')
    .select(SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (agentId) query = query.eq('agent_id', agentId);
  if (eventType) query = query.eq('event_type', eventType);

  const { data, error, count } = await query;
  if (error) {
    // If the table doesn't exist yet (migration 188 not run), surface a
    // clear, non-fatal response so the UI can show "Run migration 188 first"
    // rather than a generic 500.
    const message = error.message || '';
    if (message.includes('does not exist') || message.includes('relation') || (error as { code?: string }).code === '42P01') {
      return NextResponse.json({
        events: [],
        total: 0,
        migration_pending: true,
        detail: 'montree_agent_audit table not found. Run migration 188 in Supabase SQL Editor.',
      });
    }
    console.error('[agent-audit GET] error:', message);
    return NextResponse.json({ error: 'Failed to load agent audit log', detail: message }, { status: 500 });
  }

  return NextResponse.json({
    events: data || [],
    total: count || 0,
    limit,
    offset,
  });
}
