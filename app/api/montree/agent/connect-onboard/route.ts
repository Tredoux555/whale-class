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
import { isStripeConnectSupported, countryDisplayName } from '@/lib/montree/referral/payout-country-support';
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
  payout_method: string | null;
}

export async function POST(req: NextRequest) {
  // Diagnostic prefix so Railway logs can be grepped: [agent/connect-onboard]
  // Every observable failure surface logs once with the agent id + the
  // failure point. Without these, a "nothing happens" UI symptom is
  // impossible to root-cause from logs.
  console.log('[agent/connect-onboard] POST received');
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) {
    console.warn('[agent/connect-onboard] auth failed (verifySchoolRequest returned NextResponse)');
    return auth;
  }
  if (auth.role !== 'agent') {
    console.warn('[agent/connect-onboard] role mismatch:', auth.role, 'userId:', auth.userId);
    return NextResponse.json({ error: 'Forbidden — agent role required' }, { status: 403 });
  }
  console.log('[agent/connect-onboard] auth ok, agent userId:', auth.userId);

  const supabase = getSupabase();

  // Session 109: body may carry country for new-account creation.
  let bodyCountry: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body.country === 'string' && body.country.trim()) {
      bodyCountry = body.country.trim().toUpperCase();
    }
  } catch {
    /* no body → bodyCountry stays null; we'll error below if needed */
  }

  const { data: agentRaw, error: lookupErr } = await supabase
    .from('montree_teachers')
    .select('id, name, email, is_agent, agent_suspended_at, stripe_connect_account_id, payout_method')
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

  // 🚨 Session 109: manual-wire agents don't use Stripe Connect.
  if (agent.payout_method === 'manual_wire') {
    return NextResponse.json({
      error: 'Your payouts are set up as manual wire transfers — Stripe Connect onboarding does not apply. Bank details are on file already; message Tredoux from the Tredoux tab if anything needs updating.',
    }, { status: 409 });
  }

  // Step 1: ensure Stripe Connect account exists.
  let accountId = agent.stripe_connect_account_id;
  let createdNew = false;

  if (!accountId) {
    // 🚨 Session 109: country is required for new accounts so Stripe doesn't
    // default to the platform's HK locking the agent to wrong jurisdiction.
    if (!bodyCountry) {
      return NextResponse.json({
        error: 'Country required',
        detail: 'Pick the country where your bank account is, then try again.',
        country_required: true,
      }, { status: 400 });
    }
    if (!isStripeConnectSupported(bodyCountry)) {
      return NextResponse.json({
        error: `Stripe Connect doesn't support ${countryDisplayName(bodyCountry)} (${bodyCountry}). Reach out to Tredoux — he'll switch your payouts to manual wire (Wise / SWIFT) instead.`,
        country_unsupported: true,
      }, { status: 400 });
    }

    try {
      const account = await createConnectAccount({
        email: agent.email,
        country: bodyCountry,
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
  console.log('[agent/connect-onboard] generating onboarding link for accountId:', accountId);
  let url: string;
  let expiresAt: number;
  try {
    const link = await createOnboardingLink(accountId!);
    url = link.url;
    expiresAt = link.expires_at;
    console.log('[agent/connect-onboard] link generated successfully, expires:', expiresAt);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Could not generate onboarding link';
    // Stripe error objects have type + code fields that explain what went
    // wrong. Capture them so the agent gets a meaningful failure message.
    const stripeErr = err as { type?: string; code?: string; statusCode?: number; raw?: { message?: string } } | undefined;
    console.error('[agent/connect-onboard] link create failed:', {
      message: msg,
      type: stripeErr?.type,
      code: stripeErr?.code,
      statusCode: stripeErr?.statusCode,
      accountId,
    });
    // Friendly hint for the common "stale account" failure mode — a
    // stripe_connect_account_id that points to a test-mode account in live
    // mode (or vice versa) errors with "No such account: acct_xxx".
    let detail = msg;
    if (msg.includes('No such account') || stripeErr?.code === 'resource_missing') {
      detail = `Your Stripe Connect account (${accountId}) is no longer valid. Ask Tredoux to clear it in super-admin so you can start fresh.`;
    }
    return NextResponse.json({ error: 'Could not generate onboarding link', detail }, { status: 500 });
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
