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
  routeInvoicePaid,
  routeInvoicePaymentFailed,
  handleSubscriptionUpsert,
  handleSubscriptionDeleted,
  handleChargeRefunded,
} from '@/lib/montree/billing';
import { recordInboxEvent, markInboxStatus } from '@/lib/montree/webhook-inbox';
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

  // 🚨 Audit fix H5 (Jun 2026) — inbox-first persistence. We ack Stripe with
  // a 200 BEFORE the handler runs (Tier 3.5 perf choice below), which meant a
  // process restart mid-handler lost the event silently: Stripe won't retry a
  // 200, and the DLQ only catches handler ERRORS, not process death. So the
  // verified event is persisted to montree_webhook_inbox FIRST; only then do
  // we ack + process. Rows stuck in 'received'/'processing' = events lost to
  // a restart, queryable + replayable instead of gone.
  //
  //   * already_processed → Stripe re-delivered something we fully handled;
  //     ack and skip (downstream idempotency keys would no-op it anyway).
  //   * persist_failed    → DB couldn't store the event; return 500 so Stripe
  //     retries later. NEVER ack an event we couldn't durably record.
  //   * table_missing     → migration 253 not run yet; fall back to the
  //     pre-H5 behaviour (process without inbox) with a loud log.
  const inbox = await recordInboxEvent(supabase, {
    stripeEventId: event.id,
    eventType: event.type,
    payload: event,
  });
  if (inbox.outcome === 'already_processed') {
    return NextResponse.json({ ok: true, duplicate: true, event_type: event.type });
  }
  if (inbox.outcome === 'persist_failed') {
    return NextResponse.json(
      { error: 'Failed to persist event — retry later' },
      { status: 500 }
    );
  }
  const inboxAvailable = inbox.outcome === 'recorded';

  // 🚨 Perf Tier 3.5 (PERF_HEALTH_CHECK.md) — fire-and-forget the handler.
  // Stripe deems the webhook delivered as soon as we respond 2xx. Previously
  // we awaited the full handler chain (Sonnet calls inside trial-converted
  // emails, multi-step finance_tx inserts, AI tier upserts) before responding
  // — Stripe's 30s timeout could fire on a slow chain and trigger duplicate
  // delivery. Now we respond immediately and let the handler run in a void
  // IIFE.
  //
  // SAFETY:
  //   * Idempotency keys on every insert (source='stripe_webhook', source_ref
  //     keyed on event.id) mean Stripe replays are silent no-ops if it ever
  //     does retry. Tier 3.5 doesn't change this contract.
  //   * Handler errors land in the DLQ via captureToDeadLetter — super-admin
  //     can find + manually resolve via the ⚠️ DLQ tab.
  //   * Railway runs a long-lived Node process (not Lambda) so the IIFE has
  //     plenty of time to finish even after the response goes out.
  //   * Signature verification stays synchronous BEFORE the response — only
  //     legitimately signed events reach the IIFE.
  void (async () => {
    try {
      // H5: mark the inbox row as in-flight (best-effort; never throws).
      if (inboxAvailable) {
        await markInboxStatus(supabase, event.id, 'processing');
      }
      switch (event.type) {
        case 'invoice.paid':
        case 'invoice.payment_succeeded': {
          // Both event types fire for Alipay/WeChat invoices in Stripe's API
          // — payment_succeeded is the canonical one for non-subscription
          // invoices, paid is fired on subscription invoices. Handle both.
          // routeInvoicePaid forks to handleAlipayInvoicePaid when the
          // invoice carries Alipay/WeChat payment_method_types or the
          // montree_rail=alipay_invoice metadata flag.
          await routeInvoicePaid(supabase, event.data.object as Stripe.Invoice, event.id);
          break;
        }
        case 'invoice.payment_failed': {
          await routeInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice);
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
        case 'invoice.finalized':
        case 'invoice.sent': {
          // Defensive ack — createAlipayInvoice() finalizes synchronously, so
          // post-hoc invoice.finalized events for our invoices are no-ops. But
          // void-and-resend flows can fire these; ack cleanly so they don't
          // land in the DLQ as "unhandled."
          const inv = event.data.object as Stripe.Invoice;
          console.log(
            '[billing webhook]',
            event.type,
            'ack',
            inv.id,
            'school=', inv.metadata?.montree_school_id ?? 'unknown',
            'rail=', inv.metadata?.montree_rail ?? 'stripe_subscription'
          );
          break;
        }
        default:
          // Don't 500 on events we don't handle — Stripe sends many. Just log.
          console.log('[billing webhook] unhandled event type:', event.type);
      }
      // H5: handler chain finished cleanly — close out the inbox row.
      if (inboxAvailable) {
        await markInboxStatus(supabase, event.id, 'processed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Handler failed';
      console.error('[billing webhook] handler error for', event.type, ':', msg);
      // H5: record the failure on the inbox row (best-effort).
      if (inboxAvailable) {
        await markInboxStatus(supabase, event.id, 'failed', msg);
      }
      // Capture to dead-letter queue so super-admin can find + retry later.
      // DLQ failure must not compound the original error.
      try {
        const { captureToDeadLetter } = await import('@/lib/montree/webhook-deadletter');
        await captureToDeadLetter(supabase, {
          source: 'stripe',
          stripe_event_id: event.id,
          event_type: event.type,
          payload: event.data,
          error: err,
        });
      } catch (dlqErr) {
        console.error('[billing webhook] DLQ capture failed', dlqErr);
      }
    }
  })();

  // Respond immediately. Handler runs in the IIFE above.
  return NextResponse.json({ ok: true, queued: true, event_type: event.type });
}
