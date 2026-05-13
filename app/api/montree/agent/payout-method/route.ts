// /api/montree/agent/payout-method
//
// Session 110 — agent self-service payout method switch.
//
// PATCH — agent flips their own payout_method (typically stripe_connect →
// manual_wire when Stripe Connect doesn't support their country, or they
// just prefer a manual wire) and provides their bank details.
//
// 🚨 GUARDRAIL (mirrors super-admin rule #70):
// Refuses (409) if the agent is already verified with Stripe — that case
// requires the Stripe account to be rejected first to avoid Stripe still
// trying to pay them automatically. They have to ping Tredoux (rare case,
// strong audit signal worth the friction).
//
// 🚨 CRITICAL: agent operates only on their OWN row. JWT.sub is the only
// identity we trust — never accept an agent_id in the body or URL.
//
// GET — convenience read of the agent's own payout config. Mirrors super-admin's
// GET shape so the page can probe state before opening the modal.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { logAgentAudit } from '@/lib/montree/referral/agent-audit';
import { getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export const dynamic = 'force-dynamic';

const ALLOWED_METHODS = new Set(['stripe_connect', 'manual_wire']);
const MAX_DETAILS_BYTES = 4 * 1024;

interface AgentRow {
  id: string;
  name: string | null;
  email: string | null;
  is_agent: boolean | null;
  agent_suspended_at: string | null;
  payout_method: string | null;
  manual_payout_details: Record<string, unknown> | null;
  manual_payout_details_updated_at: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_status: string | null;
  stripe_connect_charges_enabled: boolean | null;
  stripe_connect_payouts_enabled: boolean | null;
}

async function loadSelf(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return { error: auth };
  if (auth.role !== 'agent') {
    return { error: NextResponse.json({ error: 'Forbidden — agent role required' }, { status: 403 }) };
  }

  const supabase = getSupabase();
  const { data, error: dbErr } = await supabase
    .from('montree_teachers')
    .select(
      'id, name, email, is_agent, agent_suspended_at, payout_method, manual_payout_details, manual_payout_details_updated_at, stripe_connect_account_id, stripe_connect_status, stripe_connect_charges_enabled, stripe_connect_payouts_enabled'
    )
    .eq('id', auth.userId)
    .maybeSingle();

  if (dbErr) {
    console.error('[agent/payout-method] lookup failed:', dbErr.message);
    return { error: NextResponse.json({ error: 'Lookup failed', detail: dbErr.message }, { status: 500 }) };
  }
  if (!data) return { error: NextResponse.json({ error: 'Agent not found' }, { status: 404 }) };
  const agent = data as AgentRow;
  if (!agent.is_agent) return { error: NextResponse.json({ error: 'Agent record disabled' }, { status: 403 }) };
  if (agent.agent_suspended_at) return { error: NextResponse.json({ error: 'Agent suspended' }, { status: 403 }) };

  return { agent, supabase };
}

export async function GET(req: NextRequest) {
  const result = await loadSelf(req);
  if ('error' in result) return result.error;
  const { agent } = result;

  return NextResponse.json({
    payout_method: agent.payout_method || 'stripe_connect',
    manual_payout_details: agent.manual_payout_details,
    manual_payout_details_updated_at: agent.manual_payout_details_updated_at,
    stripe_connect_account_id: agent.stripe_connect_account_id,
    stripe_connect_status: agent.stripe_connect_status,
    is_stripe_verified: !!(agent.stripe_connect_charges_enabled || agent.stripe_connect_payouts_enabled),
  });
}

export async function PATCH(req: NextRequest) {
  const result = await loadSelf(req);
  if ('error' in result) return result.error;
  const { agent, supabase } = result;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  let changedMethod = false;
  let changedDetails = false;
  let newMethod: string | null = null;

  // payout_method
  if (typeof body.payout_method === 'string') {
    const m = body.payout_method.trim();
    if (!ALLOWED_METHODS.has(m)) {
      return NextResponse.json(
        { error: `payout_method must be one of: ${Array.from(ALLOWED_METHODS).join(', ')}` },
        { status: 400 }
      );
    }

    // 🚨 GUARDRAIL — rule #70 mirror.
    // Refuse silent flip from verified Stripe Connect to manual_wire. The
    // Stripe account doesn't get deleted by this flip — it would still try
    // to pay the agent automatically and the system state would diverge.
    // Verified-agent flips have to go through super-admin (who can reject
    // the Stripe account in Dashboard first).
    if (
      m === 'manual_wire' &&
      (agent.stripe_connect_charges_enabled || agent.stripe_connect_payouts_enabled)
    ) {
      return NextResponse.json(
        {
          error: 'verified_stripe_blocked',
          detail:
            "Your Stripe Connect account is already verified — you can't switch to manual wire from here. Message Tredoux from the Tredoux tab; he'll reject the Stripe account first and switch your payouts cleanly.",
        },
        { status: 409 }
      );
    }

    updates.payout_method = m;
    newMethod = m;
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
      const serialized = JSON.stringify(d);
      if (serialized.length > MAX_DETAILS_BYTES) {
        return NextResponse.json(
          { error: `manual_payout_details exceeds ${MAX_DETAILS_BYTES} bytes — trim fields.` },
          { status: 400 }
        );
      }
      // Minimum sanity: when switching TO manual_wire, require at least one
      // identifying bank field. Otherwise the agent has bypassed the modal
      // and submitted an empty object.
      if (newMethod === 'manual_wire' || (agent.payout_method === 'manual_wire' && !newMethod)) {
        const obj = d as Record<string, unknown>;
        const hasIdentifier =
          typeof obj.account_number === 'string' && obj.account_number.trim().length > 0 ||
          typeof obj.iban === 'string' && obj.iban.trim().length > 0;
        if (!hasIdentifier) {
          return NextResponse.json(
            { error: 'Bank details need at least an account number or IBAN.' },
            { status: 400 }
          );
        }
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

  // TS 5.x narrows the generic too aggressively when supabase is returned
  // from a helper. Cast to a permissive shape — runtime payload is the same
  // as super-admin payout-config route which does this inline.
  const { error: updateErr } = await supabase
    .from('montree_teachers')
    .update(updates as never)
    .eq('id', agent.id);

  if (updateErr) {
    console.error('[agent/payout-method] update failed:', updateErr.message);
    return NextResponse.json(
      { error: 'Could not update payout method', detail: updateErr.message },
      { status: 500 }
    );
  }

  // Audit fire-and-forget — actor_role='agent' distinguishes self-service
  // from super-admin updates (which use actor_role='super_admin').
  if (changedMethod || changedDetails) {
    void logAgentAudit(supabase, {
      agent_id: agent.id,
      agent_display_name: agent.name,
      agent_email: agent.email,
      event_type: changedMethod ? 'agent_payout_method_changed' : 'agent_payout_details_updated',
      actor_role: 'agent',
      details: {
        new_method: newMethod ?? (agent.payout_method || 'stripe_connect'),
        self_service: true,
        details_changed: changedDetails,
      },
      ip_address: getClientIP(req.headers),
      user_agent: getUserAgent(req.headers),
    });
  }

  return NextResponse.json({ success: true });
}
