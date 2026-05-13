// /api/montree/super-admin/agents/[id]/payout-config
//
// Session 109 — manual payout architecture for agents in countries Stripe
// Connect Express doesn't support (China, Palestine, Lebanon, etc.) or
// who prefer manual wires.
//
// GET   — read the agent's current payout_method + manual_payout_details
// PATCH — update either or both
//
// Super-admin only. Manual_payout_details is a JSONB blob per migration 205.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { logAgentAudit } from '@/lib/montree/referral/agent-audit';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = new Set(['stripe_connect', 'manual_wire']);

// Limit on the encoded size of manual_payout_details. Bank info is tiny in
// practice — cap at 4KB so a runaway client can't blow up the row.
const MAX_DETAILS_BYTES = 4 * 1024;

interface AgentRow {
  id: string;
  name: string | null;
  email: string | null;
  is_agent: boolean | null;
  payout_method: string | null;
  manual_payout_details: Record<string, unknown> | null;
  manual_payout_details_updated_at: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_status: string | null;
}

async function loadAgent(supabase: ReturnType<typeof getSupabase>, agentId: string) {
  const { data, error } = await supabase
    .from('montree_teachers')
    .select(
      'id, name, email, is_agent, payout_method, manual_payout_details, manual_payout_details_updated_at, stripe_connect_account_id, stripe_connect_status'
    )
    .eq('id', agentId)
    .maybeSingle();
  if (error) return { error: error.message, agent: null };
  if (!data) return { error: 'Agent not found', agent: null };
  const a = data as AgentRow;
  if (!a.is_agent) return { error: 'Not an agent', agent: null };
  return { error: null, agent: a };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: agentId } = await ctx.params;
  const supabase = getSupabase();
  const { error, agent } = await loadAgent(supabase, agentId);
  if (error || !agent) return NextResponse.json({ error: error || 'Agent not found' }, { status: 404 });

  return NextResponse.json({
    agent_id: agent.id,
    name: agent.name,
    email: agent.email,
    payout_method: agent.payout_method || 'stripe_connect',
    manual_payout_details: agent.manual_payout_details,
    manual_payout_details_updated_at: agent.manual_payout_details_updated_at,
    stripe_connect_account_id: agent.stripe_connect_account_id,
    stripe_connect_status: agent.stripe_connect_status,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: agentId } = await ctx.params;
  const supabase = getSupabase();
  const { error: loadErr, agent } = await loadAgent(supabase, agentId);
  if (loadErr || !agent) return NextResponse.json({ error: loadErr || 'Agent not found' }, { status: 404 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  let changedMethod = false;
  let changedDetails = false;

  // payout_method
  if (typeof body.payout_method === 'string') {
    const m = body.payout_method.trim();
    if (!ALLOWED_METHODS.has(m)) {
      return NextResponse.json(
        { error: `payout_method must be one of: ${Array.from(ALLOWED_METHODS).join(', ')}` },
        { status: 400 }
      );
    }
    // Safety: refuse to switch a Stripe-Connect-onboarded agent (with a real
    // verified account) to manual_wire silently. Their Stripe account doesn't
    // get deleted by the flip — caller must reject the Stripe account first.
    if (
      m === 'manual_wire' &&
      agent.stripe_connect_account_id &&
      agent.stripe_connect_status === 'verified'
    ) {
      return NextResponse.json(
        {
          error:
            'This agent has a verified Stripe Connect account. Reject it in Stripe Dashboard FIRST, then switch to manual_wire — otherwise Stripe will keep trying to pay them automatically and the system state will diverge.',
        },
        { status: 409 }
      );
    }
    updates.payout_method = m;
    changedMethod = m !== (agent.payout_method || 'stripe_connect');
  }

  // manual_payout_details
  if ('manual_payout_details' in body) {
    const d = body.manual_payout_details;
    if (d === null) {
      updates.manual_payout_details = null;
      updates.manual_payout_details_updated_at = null;
      changedDetails = true;
    } else if (typeof d === 'object' && !Array.isArray(d)) {
      // Size check
      const serialized = JSON.stringify(d);
      if (serialized.length > MAX_DETAILS_BYTES) {
        return NextResponse.json(
          { error: `manual_payout_details exceeds ${MAX_DETAILS_BYTES} bytes — trim fields.` },
          { status: 400 }
        );
      }
      updates.manual_payout_details = d;
      updates.manual_payout_details_updated_at = new Date().toISOString();
      changedDetails = true;
    } else {
      return NextResponse.json(
        { error: 'manual_payout_details must be an object or null' },
        { status: 400 }
      );
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from('montree_teachers')
    .update(updates)
    .eq('id', agentId);

  if (updateErr) {
    console.error('[payout-config PATCH] update failed:', updateErr.message);
    return NextResponse.json(
      { error: 'Could not update payout config', detail: updateErr.message },
      { status: 500 }
    );
  }

  // Audit fire-and-forget
  if (changedMethod || changedDetails) {
    void logAgentAudit(supabase, {
      agent_id: agentId,
      agent_display_name: agent.name,
      agent_email: agent.email,
      event_type: changedMethod ? 'agent_payout_method_changed' : 'agent_payout_details_updated',
      actor_role: 'super_admin',
      details: {
        new_method: updates.payout_method ?? (agent.payout_method || 'stripe_connect'),
        details_changed: changedDetails,
      },
    });
  }

  return NextResponse.json({ success: true });
}
