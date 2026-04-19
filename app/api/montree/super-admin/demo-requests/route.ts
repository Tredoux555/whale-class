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

  return NextResponse.json({
    requests: requests || [],
    logs: logs || [],
    total: requests?.length || 0,
    pending: requests?.filter((r: Record<string, unknown>) => r.status === 'demo_requested').length || 0,
    contacted: requests?.filter((r: Record<string, unknown>) => r.status === 'contacted').length || 0,
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
