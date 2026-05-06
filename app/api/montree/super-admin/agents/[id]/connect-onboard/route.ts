// /api/montree/super-admin/agents/[id]/connect-onboard/route.ts
//
// Phase 3 — Stripe Connect Express onboarding for referral agents.
//
// POST: creates a Stripe Connect account for the agent if one doesn't exist,
//       then generates a one-time onboarding URL the agent uses to fill in
//       their bank + tax info on Stripe's hosted form.
//
// Super-admin only. Idempotent — calling twice for the same agent reuses
// the existing account and just generates a fresh onboarding link.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { createConnectAccount, createOnboardingLink } from '@/lib/montree/referral/stripe-connect';

export const dynamic = 'force-dynamic';

interface AgentRow {
  id: string;
  name: string | null;
  email: string | null;
  stripe_connect_account_id: string | null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: agentId } = await ctx.params;
  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json({ error: 'agent id required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Pull the agent. We use montree_teachers as the agent table for Phase 1.
  const { data: agentRaw, error: lookupErr } = await supabase
    .from('montree_teachers')
    .select('id, name, email, stripe_connect_account_id')
    .eq('id', agentId)
    .maybeSingle();

  if (lookupErr) {
    console.error('[connect-onboard] lookup failed:', lookupErr.message);
    return NextResponse.json({ error: 'Database lookup failed' }, { status: 500 });
  }
  if (!agentRaw) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  const agent = agentRaw as AgentRow;

  if (!agent.email) {
    return NextResponse.json({
      error: 'Agent has no email on file. Add an email to the agent before generating an onboarding link.',
    }, { status: 400 });
  }

  // Step 1: ensure a Stripe Connect account exists for this agent.
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

      // Race-safe update: only set the account ID if the field is still NULL.
      // Two simultaneous POSTs would both reach this point with NULL; without
      // the IS NULL filter the second write would overwrite the first,
      // orphaning the first Stripe account. With it, the second write
      // matches 0 rows and we know we lost the race.
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
        console.error('[connect-onboard] persisted-after-create failed for agent', agent.id, ':', updateErr.message, 'orphan account:', accountId);
        return NextResponse.json({
          error: 'Stripe account created but could not be saved. Contact support — orphan account: ' + accountId,
        }, { status: 500 });
      }
      if (!updated) {
        // Race lost. Re-fetch the agent to find the canonical account ID,
        // and proceed with onboarding link generation against THAT account.
        // The account we just created is orphaned in Stripe — log it.
        console.warn('[connect-onboard] race detected for agent', agent.id, '— orphan Stripe account:', accountId);
        const { data: refreshed } = await supabase
          .from('montree_teachers')
          .select('stripe_connect_account_id')
          .eq('id', agent.id)
          .maybeSingle();
        if (refreshed?.stripe_connect_account_id) {
          accountId = refreshed.stripe_connect_account_id as string;
          createdNew = false;
        } else {
          // Should be impossible — the race winner should have written the ID.
          return NextResponse.json({
            error: 'Race condition resolution failed. Try again.',
          }, { status: 500 });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Stripe account creation failed';
      console.error('[connect-onboard] Stripe account create failed:', msg);
      return NextResponse.json({
        error: 'Could not create Stripe Connect account. Verify STRIPE_SECRET_KEY is set and Connect is enabled on your platform account.',
        detail: msg,
      }, { status: 500 });
    }
  }

  // Step 2: generate a fresh one-time onboarding link.
  let url: string;
  let expiresAt: number;
  try {
    const link = await createOnboardingLink(accountId);
    url = link.url;
    expiresAt = link.expires_at;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Could not generate onboarding link';
    console.error('[connect-onboard] account link create failed:', msg);
    return NextResponse.json({ error: 'Could not generate onboarding link', detail: msg }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    created_new: createdNew,
    account_id: accountId,
    onboarding_url: url,
    onboarding_expires_at: expiresAt,
  });
}
