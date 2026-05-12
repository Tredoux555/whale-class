import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export async function GET(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();

  // Get all demo requests, newest first
  const { data: requests, error } = await supabase
    .from('montree_outreach_contacts')
    .select('*')
    .eq('source', 'landing_page')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get activity log for demo requests
  const { data: logs } = await supabase
    .from('montree_outreach_log')
    .select('*')
    .eq('action', 'demo_requested')
    .order('created_at', { ascending: false })
    .limit(50);

  // Drip activity per request — which dayN drips have fired for each contact
  const reqIds = (requests || []).map((r) => (r as { id: string }).id);
  const dripsByContact: Record<string, string[]> = {};
  if (reqIds.length > 0) {
    const { data: dripRows } = await supabase
      .from('montree_outreach_log')
      .select('contact_id, action, created_at')
      .in('action', [
        'demo_request_drip_day3',
        'demo_request_drip_day7',
        'demo_request_drip_day14',
      ])
      .in('contact_id', reqIds);
    for (const row of (dripRows || []) as Array<{ contact_id: string; action: string }>) {
      if (!row.contact_id) continue;
      const dayKey = row.action.replace('demo_request_drip_', ''); // 'day3' | 'day7' | 'day14'
      if (!dripsByContact[row.contact_id]) dripsByContact[row.contact_id] = [];
      if (!dripsByContact[row.contact_id].includes(dayKey)) {
        dripsByContact[row.contact_id].push(dayKey);
      }
    }
  }

  // Enrich each request with its drip activity
  const enrichedRequests = (requests || []).map((r) => {
    const id = (r as { id: string }).id;
    return {
      ...r,
      drips_sent: dripsByContact[id] || [], // e.g., ['day3', 'day7']
    };
  });

  return NextResponse.json({
    requests: enrichedRequests,
    logs: logs || [],
    total: enrichedRequests.length,
    pending: enrichedRequests.filter((r: Record<string, unknown>) => r.status === 'demo_requested').length,
    contacted: enrichedRequests.filter((r: Record<string, unknown>) => r.status === 'contacted').length,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

// Mark a demo request as contacted/done
export async function PATCH(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status, notes } = await req.json();
  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('montree_outreach_contacts')
    .update({ status, notes: notes || undefined, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
