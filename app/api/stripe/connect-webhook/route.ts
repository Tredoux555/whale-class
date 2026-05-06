// /api/stripe/connect-webhook/route.ts
//
// Phase 3 — Stripe Connect webhook for the agent referral programme.
//
// Stripe POSTs here whenever a Connect account changes — typically when the
// agent completes onboarding, fixes a verification issue, or has their
// account restricted. We update montree_teachers so super admin always
// shows the current status without polling.
//
// Configure in Stripe Dashboard:
//   - URL: https://montree.xyz/api/stripe/connect-webhook
//   - Events: account.updated  (that's all we need for Phase 3)
//   - Mode: Connect (not "Account") — we want events for connected accounts,
//     not our own platform account
//
// Webhook secret goes in STRIPE_CONNECT_WEBHOOK_SECRET env var. Falls back
// to STRIPE_WEBHOOK_SECRET only if Connect-specific not set, but you should
// always use the dedicated Connect endpoint secret in production.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/montree/stripe';
import { getSupabase } from '@/lib/supabase-client';
import { summariseStatus } from '@/lib/montree/referral/stripe-connect';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }
  if (!secret) {
    console.error('[connect-webhook] STRIPE_CONNECT_WEBHOOK_SECRET (or STRIPE_WEBHOOK_SECRET) not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // Stripe requires the RAW body for signature verification.
  const body = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'signature verification failed';
    console.error('[connect-webhook] signature verification failed:', msg);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getSupabase();

  try {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const summary = summariseStatus(account);

        // Find the agent. The Connect account ID is unique on
        // montree_teachers.stripe_connect_account_id (per migration 187).
        const { data: agent, error: lookupErr } = await supabase
          .from('montree_teachers')
          .select('id, stripe_connect_status, stripe_connect_completed_at')
          .eq('stripe_connect_account_id', account.id)
          .maybeSingle();

        if (lookupErr) {
          console.error('[connect-webhook] agent lookup failed:', lookupErr.message);
          // Still return 200 — Stripe retries on non-2xx, and a DB hiccup
          // shouldn't cause Stripe to retry this event indefinitely.
          break;
        }
        if (!agent) {
          // Account exists in Stripe but not in our DB. Could be a manually
          // created account in Stripe Dashboard, or a stale event from before
          // we wired up the orphan-recovery path. Log and move on.
          console.warn('[connect-webhook] account.updated for unknown agent:', account.id);
          break;
        }

        // Stamp completed_at on the FIRST transition to verified. Don't
        // overwrite an earlier completed_at if it's already set (audit trail).
        const completedAt = summary.status === 'verified' && !agent.stripe_connect_completed_at
          ? new Date().toISOString()
          : agent.stripe_connect_completed_at;

        const { error: updateErr } = await supabase
          .from('montree_teachers')
          .update({
            stripe_connect_status: summary.status,
            stripe_connect_charges_enabled: summary.charges_enabled,
            stripe_connect_payouts_enabled: summary.payouts_enabled,
            stripe_connect_details_submitted: summary.details_submitted,
            stripe_connect_disabled_reason: summary.disabled_reason,
            stripe_connect_completed_at: completedAt,
            stripe_connect_updated_at: new Date().toISOString(),
          })
          .eq('id', agent.id);

        if (updateErr) {
          console.error('[connect-webhook] agent update failed:', updateErr.message);
        } else {
          console.log(`[connect-webhook] agent ${agent.id} → ${summary.status}`);
        }
        break;
      }

      // Other Connect events we may add later: payout.paid, transfer.failed, etc.
      // For Phase 3 we only need account.updated.

      default:
        // Acknowledge unhandled events without 4xx — Stripe sees 200 and stops
        // retrying. We still log for observability.
        console.log('[connect-webhook] unhandled event type:', event.type);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'webhook handler error';
    console.error('[connect-webhook] handler error:', msg);
    // Return 200 anyway — re-delivering the same event won't fix a code bug.
    // We log loudly enough that Tredoux sees it in Railway logs.
  }

  return NextResponse.json({ received: true });
}
