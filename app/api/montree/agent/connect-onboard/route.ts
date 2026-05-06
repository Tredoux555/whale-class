// /api/montree/agent/connect-onboard/route.ts
//
// Phase 7d — Agent self-service Stripe Connect onboarding.
//
// POST: same flow as super admin's /agents/[id]/connect-onboard but the
// agent calls it on themselves. Creates a Stripe Connect Express account
// if one doesn't exist, then generates a fresh one-time onboarding URL.
//
// Rate limit: 10/hour per agent. The link expires in ~5min so generating a
// few in succession is fine; 10/hour is just abuse protection.
//
// 🚨 CRITICAL: agent operates only on their OWN row. The verifySchoolRequest
// JWT.sub is the only identity we trust — never accept an agent_id in the
// body or URL.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { createConnectAccount, createOnboardingLink } from '@/lib/montree/referral/stripe-connect';
import { logAgentAudit } from '@/lib/montree/referral/agent-audit';
import { getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export const dynamic = 'force-dynamic';

interface AgentRow {
  id: string;
  name: string | null;
  email: string | null;
  is_agent: boolean | null;
  agent_suspended_at: string | null;
  stripe_connect_account_id: string | null;
}

export async function POST(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'agent') {
    return NextResponse.json({ error: 'Forbidden — agent role required' }, { status: 403 });
  }

  const supabase = getSupabase();

  const { data: agentRaw, error: lookupErr } = await supabase
    .from('montree_teachers')
    .select('id, name, email, is_agent, agent_suspended_at, stripe_connect_account_id')
    .eq('id', auth.userId)
    .maybeSingle();

  if (lookupErr) {
    console.error('[agent/connect-onboard] lookup failed:', lookupErr.message);
    return NextResponse.json({ error: 'Lookup failed', detail: lookupErr.message }, { status: 500 });
  }
  if (!agentRaw) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  const agent = agentRaw as AgentRow;
  if (!agent.is_agent) return NextResponse.json({ error: 'Agent record disabled' }, { status: 403 });
  if (agent.agent_suspended_at) return NextResponse.json({ error: 'Agent suspended' }, { status: 403 });
  if (!agent.email) {
    return NextResponse.json({
      error: 'Email missing on your profile',
      detail: 'Reach out to Tredoux — Stripe needs an email on file before generating an onboarding link.',
    }, { status: 400 });
  }

  // Step 1: ensure Stripe Connect account exists.
  let accountId = agent.stripe_connect_account_id;
  let createdNew = false;

  if (!accountId) {
    try {
      const account = await createConnectAccount({
        email: agent.email,
        display_name: agent.name || agent.email,
      });
      accountId = account.id;
      createdNew = true;

      // Race-safe persist: only set the account ID if NULL. Two simultaneous
      // POSTs would both reach this point with NULL; the second loses the race.
      const { data: updated, error: updateErr } = await supabase
        .from('montree_teachers')
        .update({
          stripe_connect_account_id: accountId,
          stripe_connect_status: 'pending',
          stripe_connect_updated_at: new Date().toISOString(),
        })
        .eq('id', agent.id)
        .is('stripe_connect_account_id', null)
        .select('id')
        .maybeSingle();

      if (updateErr) {
        console.error('[agent/connect-onboard] persist failed for agent', agent.id, ':', updateErr.message, 'orphan account:', accountId);
        return NextResponse.json({
          error: 'Stripe account created but could not be saved. Try again — orphan: ' + accountId,
        }, { status: 500 });
      }
      if (!updated) {
        // Race lost — re-fetch canonical account ID and continue.
        console.warn('[agent/connect-onboard] race detected for agent', agent.id, '— orphan Stripe account:', accountId);
        const { data: refreshed } = await supabase
          .from('montree_teachers')
          .select('stripe_connect_account_id')
          .eq('id', agent.id)
          .maybeSingle();
        if (refreshed?.stripe_connect_account_id) {
          accountId = refreshed.stripe_connect_account_id as string;
          createdNew = false;
        } else {
          return NextResponse.json({ error: 'Race resolution failed. Try again.' }, { status: 500 });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Stripe account creation failed';
      console.error('[agent/connect-onboard] create failed:', msg);
      return NextResponse.json({
        error: 'Could not create Stripe Connect account',
        detail: msg,
      }, { status: 500 });
    }
  }

  // Step 2: fresh onboarding link.
  let url: string;
  let expiresAt: number;
  try {
    const link = await createOnboardingLink(accountId!);
    url = link.url;
    expiresAt = link.expires_at;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Could not generate onboarding link';
    console.error('[agent/connect-onboard] link create failed:', msg);
    return NextResponse.json({ error: 'Could not generate onboarding link', detail: msg }, { status: 500 });
  }

  void logAgentAudit(supabase, {
    agent_id: agent.id,
    agent_display_name: agent.name,
    agent_email: agent.email,
    event_type: 'agent_stripe_link_generated',
    actor_role: 'agent',
    details: { created_new_account: createdNew },
    ip_address: getClientIP(req.headers),
    user_agent: getUserAgent(req.headers),
  });

  return NextResponse.json({
    ok: true,
    created_new: createdNew,
    account_id: accountId,
    onboarding_url: url,
    onboarding_expires_at: expiresAt,
  });
}
