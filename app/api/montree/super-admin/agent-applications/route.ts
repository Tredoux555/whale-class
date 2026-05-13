// /api/montree/super-admin/agent-applications
//
// Super-admin endpoint for viewing + actioning inbound agent applications
// from /montree/become-an-agent. Mirrors /super-admin/demo-requests pattern.
//
// GET   — list applications, filterable by status (default: status='agent_applied')
// PATCH — update status. Allowed transitions:
//          agent_applied → sent       (Tredoux issued a code = accepted)
//          agent_applied → contacted  (Tredoux acknowledged, code TBD)
//          agent_applied → declined
//          agent_applied → dead       (spam / unrelated)
//
// 🚨 Cross-pollination contract: this is super-admin only. No agent or
// principal scope filtering — Tredoux sees ALL applications globally.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export async function GET(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get('status'); // optional

  let query = supabase
    .from('montree_outreach_contacts')
    .select('*')
    .eq('contact_type', 'agent_application')
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data: applications, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = applications || [];
  return NextResponse.json(
    {
      applications: list,
      total: list.length,
      pending: list.filter((a) => (a as { status: string }).status === 'agent_applied').length,
      accepted: list.filter((a) => (a as { status: string }).status === 'sent').length,
      declined: list.filter((a) => (a as { status: string }).status === 'declined').length,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

const ALLOWED_STATUS_TRANSITIONS = new Set([
  'sent',         // accepted (Tredoux issued a code)
  'contacted',    // acknowledged but not yet decided
  'declined',     // explicit decline
  'dead',         // spam / unrelated / abandoned
  'agent_applied', // allow back to pending if super-admin mis-clicked
]);

export async function PATCH(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, status, notes } = body || {};

  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  }

  if (!ALLOWED_STATUS_TRANSITIONS.has(status)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed: ${Array.from(ALLOWED_STATUS_TRANSITIONS).join(', ')}` },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  // Defensive: confirm this row IS an agent application before mutating.
  const { data: existing, error: lookupErr } = await supabase
    .from('montree_outreach_contacts')
    .select('id, contact_type')
    .eq('id', id)
    .maybeSingle();

  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }
  if ((existing as { contact_type: string }).contact_type !== 'agent_application') {
    return NextResponse.json(
      { error: 'Refusing to update non-application row via this endpoint' },
      { status: 409 }
    );
  }

  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (typeof notes === 'string' && notes.trim().length > 0) {
    updatePayload.notes = notes.trim();
  }

  const { error: updateErr } = await supabase
    .from('montree_outreach_contacts')
    .update(updatePayload)
    .eq('id', id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Log the action (fire-and-forget)
  void supabase
    .from('montree_outreach_log')
    .insert({
      action: `agent_application_${status}`,
      contact_id: id,
      details: { status, notes: notes || null },
    })
    .then(({ error }) => {
      if (error) console.error('[agent-applications PATCH] log insert failed:', error.message);
    });

  return NextResponse.json({ success: true });
}
