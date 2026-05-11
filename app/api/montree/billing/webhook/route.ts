// /api/montree/billing/webhook/route.ts
//
// Phase 4 — Stripe webhook handler for the unified $7/student/month plan.
// Replaces the old tier-based handler (basic/standard/premium with
// max_students). The new model is a single Price with quantity = headcount.
//
// 🚨 BUILD STRATEGY: ships BEFORE Stripe credentials are configured. When
// STRIPE_WEBHOOK_SECRET is missing, returns 503 with a clear message so
// Stripe's webhook delivery dashboard shows "endpoint not ready" rather
// than crashing.
//
// Idempotency: every event handler writes via lib/montree/billing.ts which
// uses (source='stripe_webhook', source_ref=event_id) as a unique key on
// montree_finance_transactions. Replays are silent no-ops.
//
// Configure in Stripe Dashboard:
//   URL:    https://montree.xyz/api/montree/billing/webhook
//   Mode:   Account (NOT Connect — this handles platform billing, not
//                    referral-agent payouts; that's connect-webhook)
//   Events: invoice.paid, invoice.payment_failed,
//           customer.subscription.created, customer.subscription.updated,
//           customer.subscription.deleted, charge.refunded

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import {
  getBillingConfig,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionUpsert,
  handleSubscriptionDeleted,
  handleChargeRefunded,
} from '@/lib/montree/billing';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Session 103 Tier 0.2: Stripe webhooks must respond within 30s. Railway's
// default 15s timeout can cause Stripe to retry, producing duplicate events.
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const cfg = getBillingConfig();

  // Pre-Stripe-config: respond 503 so Stripe's webhook dashboard shows
  // "endpoint not yet configured" rather than crashing or appearing healthy.
  if (!cfg.configured) {
    console.warn('[billing webhook] received event but config incomplete:', cfg.reason);
    return NextResponse.json(
      { error: 'Billing not configured', detail: cfg.reason },
      { status: 503 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 });
  }

  // Verify signature.
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed';
    console.error('[billing webhook] signature verification failed:', msg);
    return NextResponse.json({ error: 'Invalid signature', detail: msg }, { status: 400 });
  }

  const supabase = getSupabase();

  // Always log the event we received — useful for debugging at low volume.
  console.log('[billing webhook]', event.type, event.id);

  try {
    switch (event.type) {
      case 'invoice.paid': {
        await handleInvoicePaid(supabase, event.data.object as Stripe.Invoice, event.id);
        break;
      }
      case 'invoice.payment_failed': {
        await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await handleSubscriptionUpsert(supabase, event.data.object as Stripe.Subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
        break;
      }
      case 'charge.refunded': {
        await handleChargeRefunded(supabase, event.data.object as Stripe.Charge, event.id);
        break;
      }
      default:
        // Don't 500 on events we don't handle — Stripe sends many. Just log.
        console.log('[billing webhook] unhandled event type:', event.type);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Handler failed';
    console.error('[billing webhook] handler error for', event.type, ':', msg);
    // Capture to dead-letter queue so super-admin can find + retry later.
    // Fire-and-forget — DLQ failure must not compound the original error.
    import('@/lib/montree/webhook-deadletter')
      .then(({ captureToDeadLetter }) =>
        captureToDeadLetter(supabase, {
          source: 'stripe',
          stripe_event_id: event.id,
          event_type: event.type,
          payload: event.data,
          error: err,
        })
      )
      .catch((dlqErr) => console.error('[billing webhook] DLQ capture failed', dlqErr));
    // Return 200 anyway — Stripe will retry on 500s and we'd rather not
    // create a retry storm. The error is captured in the DLQ for manual
    // resolution.
    return NextResponse.json({ ok: false, handled: false, error: msg, dlq: true });
  }

  return NextResponse.json({ ok: true, handled: true, event_type: event.type });
}
