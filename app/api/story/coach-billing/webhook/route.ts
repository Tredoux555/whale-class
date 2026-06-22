// app/api/story/coach-billing/webhook/route.ts
//
// Lyf Coach Stripe webhook — SEPARATE endpoint from Montree's school-billing
// webhook, on the SAME Stripe account, with its OWN signing secret
// (STORY_STRIPE_WEBHOOK_SECRET).
//
// 🚨 Why this does NOT share montree_webhook_inbox: both endpoints live on one
// account, and Stripe delivers a subscribed event type to EVERY endpoint that
// subscribes to it. A shared inbox keyed on event.id would let whichever
// endpoint records first mark the event 'already_processed' — the real handler
// on the other endpoint would then skip. So this webhook instead:
//   • processes SYNCHRONOUSLY (handler is light — a few DB writes, no AI), then
//   • returns 500 on failure so Stripe RETRIES (true at-least-once delivery), and
//   • idempotency is the ledger's (source, source_ref) unique index + idempotent
//     state upserts, so a Stripe retry is a clean no-op.
// The customer→space lookup doubles as the "is this event even ours?" guard:
// an event for a customer we don't have a story_admin_users row for is acked
// and skipped (it's a Montree event delivered here by overlapping subscription).
//
// Configure in Stripe Dashboard (Account mode, NOT Connect):
//   URL: https://montree.xyz/api/story/coach-billing/webhook
//   Events: invoice.paid, invoice.payment_succeeded, invoice.payment_failed,
//           customer.subscription.created, customer.subscription.updated,
//           customer.subscription.deleted, charge.refunded

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/story-db';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Supa = ReturnType<typeof getSupabase>;

const PRODUCT = 'lyf_coach';
// Estimated processing fee (reconciled against Stripe payouts later, like Montree).
const STRIPE_PCT = 0.029;
const STRIPE_FLAT_USD = 0.3;
const STRIPE_TAX_PCT = 0.005; // Stripe Tax calc fee, ~0.5% of the taxable amount

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Resolve a Stripe customer id → coach space. null = not a Lyf Coach customer. */
async function spaceForCustomer(supabase: Supa, customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const { data, error } = await supabase
    .from('story_admin_users')
    .select('space')
    .eq('stripe_customer_id', customerId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return (data.space as string) ?? null;
}

/** Insert a ledger row; swallow the (source, source_ref) unique-violation replay. */
async function insertLedger(
  supabase: Supa,
  row: {
    occurred_at: string;
    type: string;
    category: string;
    description: string;
    original_currency: string;
    original_amount: number;
    usd_amount: number;
    source_ref: string;
    jurisdiction?: string | null;
    stripe_invoice_id?: string | null;
    stripe_charge_id?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('montree_finance_transactions').insert({
    occurred_at: row.occurred_at,
    type: row.type,
    category: row.category,
    description: row.description,
    product: PRODUCT,
    jurisdiction: row.jurisdiction ?? null,
    original_currency: row.original_currency,
    original_amount: row.original_amount,
    fx_rate: 1.0,
    usd_amount: row.usd_amount,
    source: 'stripe_webhook',
    source_ref: row.source_ref,
    stripe_invoice_id: row.stripe_invoice_id ?? null,
    stripe_charge_id: row.stripe_charge_id ?? null,
  });
  if (error && error.code !== '23505') {
    // Re-throw non-idempotency errors so the handler returns 500 → Stripe retries.
    throw new Error(`ledger insert (${row.source_ref}): ${error.message}`);
  }
}

async function setSubscriptionState(
  supabase: Supa,
  space: string,
  patch: { subscription_status?: string; plan?: string; current_period_end?: string | null; subscription_id?: string | null },
): Promise<void> {
  const { error } = await supabase.from('story_admin_users').update(patch).eq('space', space);
  if (error) throw new Error(`state update (${space}): ${error.message}`);
}

// ── Handlers ────────────────────────────────────────────────────────────────

// Read invoice fields through a loose shape — Stripe has moved some of these
// (tax, subscription) across SDK type versions; the runtime fields are present
// for the pinned 2024-12-18.acacia API version regardless of installed types.
interface InvoiceFields {
  id: string;
  currency?: string;
  subtotal?: number;
  tax?: number | null;
  total?: number;
  amount_paid?: number;
  created?: number;
  subscription?: string | null;
  customer_address?: { country?: string | null } | null;
  lines?: { data?: Array<{ period?: { end?: number } }> };
}

async function handleInvoicePaid(supabase: Supa, invoice: Stripe.Invoice, space: string): Promise<void> {
  const f = invoice as unknown as InvoiceFields;
  const currency = (f.currency || 'usd').toUpperCase();
  const subtotal = (f.subtotal ?? 0) / 100;        // ex-VAT — this is revenue
  const taxAmt = (f.tax ?? 0) / 100;               // pass-through VAT liability
  const total = (f.total ?? f.amount_paid ?? 0) / 100;
  const occurredAt = new Date((f.created || Math.floor(Date.now() / 1000)) * 1000).toISOString();
  const country = f.customer_address?.country ?? null;
  const invId = f.id;

  // 1) income — net subscription revenue (ex-VAT)
  if (subtotal > 0) {
    await insertLedger(supabase, {
      occurred_at: occurredAt, type: 'income', category: 'subscription',
      description: 'Lyf Coach subscription', original_currency: currency,
      original_amount: round4(subtotal), usd_amount: round4(subtotal),
      source_ref: `lc_inv:${invId}`, stripe_invoice_id: invId,
    });
  }
  // 2) direct_cost — estimated Stripe processing fee + Stripe Tax calc fee
  const fee = round4(total * STRIPE_PCT + STRIPE_FLAT_USD + subtotal * STRIPE_TAX_PCT);
  if (fee > 0) {
    await insertLedger(supabase, {
      occurred_at: occurredAt, type: 'direct_cost', category: 'stripe_fee',
      description: 'Stripe processing + tax fee (est.)', original_currency: currency,
      original_amount: fee, usd_amount: fee,
      source_ref: `lc_fee:${invId}`, stripe_invoice_id: invId,
    });
  }
  // 3) tax_collected — pass-through VAT liability, tagged by jurisdiction
  if (taxAmt > 0) {
    await insertLedger(supabase, {
      occurred_at: occurredAt, type: 'tax_collected', category: 'vat',
      description: `VAT collected${country ? ` (${country})` : ''}`, original_currency: currency,
      original_amount: round4(taxAmt), usd_amount: round4(taxAmt),
      source_ref: `lc_vat:${invId}`, jurisdiction: country, stripe_invoice_id: invId,
    });
  }
  // Reflect period end + subscription id. We deliberately do NOT set the status
  // here — the customer.subscription.* events are the authority for status (they
  // fire alongside invoice.paid at checkout). If invoice.paid set 'active', a
  // late/retried invoice arriving after a cancel could resurrect a canceled sub
  // (Stripe doesn't guarantee event order). Leaving status to subscription.*.
  const periodEnd = f.lines?.data?.[0]?.period?.end;
  await setSubscriptionState(supabase, space, {
    plan: 'sealed_individual',
    ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
    ...(typeof f.subscription === 'string' ? { subscription_id: f.subscription } : {}),
  });
}

async function handleSubscriptionUpsert(supabase: Supa, sub: Stripe.Subscription, space: string): Promise<void> {
  // current_period_end moved to items.data[].current_period_end in newer Stripe
  // API/SDK versions — try the top level then fall back to the item.
  const s = sub as unknown as {
    status: string;
    id: string;
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const periodEndUnix = s.current_period_end ?? s.items?.data?.[0]?.current_period_end;
  await setSubscriptionState(supabase, space, {
    subscription_status: s.status,
    plan: 'sealed_individual',
    current_period_end: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
    subscription_id: s.id,
  });
}

async function handleSubscriptionDeleted(supabase: Supa, _sub: Stripe.Subscription, space: string): Promise<void> {
  await setSubscriptionState(supabase, space, { subscription_status: 'canceled' });
}

async function handleChargeRefunded(supabase: Supa, charge: Stripe.Charge): Promise<void> {
  // Reverse income + VAT proportional to the refund. Negative rows, idempotent.
  const currency = (charge.currency || 'usd').toUpperCase();
  const refunded = (charge.amount_refunded ?? 0) / 100;
  if (refunded <= 0) return;
  const occurredAt = new Date((charge.created || Math.floor(Date.now() / 1000)) * 1000).toISOString();
  // We don't split VAT vs net on a raw charge refund here (no line tax breakdown);
  // record the refund as a negative income adjustment. VAT correction, if needed,
  // is a manual remittance-period adjustment in the Tax view (rare for v1).
  await insertLedger(supabase, {
    occurred_at: occurredAt, type: 'income', category: 'refund',
    description: 'Lyf Coach refund', original_currency: currency,
    original_amount: round4(-refunded), usd_amount: round4(-refunded),
    source_ref: `lc_refund:${charge.id}`, stripe_charge_id: charge.id,
  });
}

// ── Route ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const secret = process.env.STORY_STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeKey) {
    return NextResponse.json({ error: 'Coach billing webhook not configured' }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 });

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed';
    console.error('[coach webhook] signature verification failed:', msg);
    return NextResponse.json({ error: 'Invalid signature', detail: msg }, { status: 400 });
  }

  const supabase = getSupabase();
  console.log('[coach webhook]', event.type, event.id);

  // Resolve the customer on the event → space. If we don't own this customer,
  // it's a Montree event delivered to this endpoint by overlapping subscription
  // — ack and skip cleanly.
  function customerIdOf(obj: unknown): string | null {
    const c = (obj as { customer?: unknown }).customer;
    return typeof c === 'string' ? c : null;
  }

  try {
    switch (event.type) {
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const inv = event.data.object as Stripe.Invoice;
        const space = await spaceForCustomer(supabase, customerIdOf(inv));
        if (!space) break; // not ours — ack-skip
        await handleInvoicePaid(supabase, inv, space);
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const space = await spaceForCustomer(supabase, customerIdOf(inv));
        if (!space) break;
        await setSubscriptionState(supabase, space, { subscription_status: 'past_due' });
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const space = await spaceForCustomer(supabase, customerIdOf(sub));
        if (!space) break;
        await handleSubscriptionUpsert(supabase, sub, space);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const space = await spaceForCustomer(supabase, customerIdOf(sub));
        if (!space) break;
        await handleSubscriptionDeleted(supabase, sub, space);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const space = await spaceForCustomer(supabase, customerIdOf(charge));
        if (!space) break;
        await handleChargeRefunded(supabase, charge);
        break;
      }
      default:
        console.log('[coach webhook] unhandled event type:', event.type);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Handler failed';
    console.error('[coach webhook] handler error for', event.type, ':', msg);
    // Best-effort DLQ capture (shared table is fine — keyed on event.id, unique).
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
      console.error('[coach webhook] DLQ capture failed', dlqErr);
    }
    // 500 → Stripe retries. Ledger + state writes are idempotent so a retry is safe.
    return NextResponse.json({ error: 'Handler failed — will retry' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event_type: event.type });
}
