// app/api/dark-phonics/webhook/route.ts
//
// Stripe → montree_dp_subscriptions. A SEPARATE endpoint from the school
// webhook, with its own signing secret.
//
// 🚨 WHY SEPARATE. /api/montree/billing/webhook handles the school plan and
// verifies against STRIPE_WEBHOOK_SECRET. Two endpoints in one Stripe account
// each get their own secret, and mixing them would mean every Dark Phonics
// event ran through the school's handler (and vice versa) before being
// recognised as irrelevant. One product, one endpoint, one secret:
//
//   URL:    https://montree.xyz/api/dark-phonics/webhook
//   Secret: STRIPE_DP_WEBHOOK_SECRET
//   Events: checkout.session.completed,
//           customer.subscription.created / .updated / .deleted
//
// Identity comes from `metadata.montree_dp_user_id`, stamped by the checkout
// route on both the session and the subscription. An event without it is
// acknowledged and ignored — it belongs to another product.
//
// Idempotent by construction: every write is an upsert keyed on
// community_user_id, so a Stripe replay lands on the same row with the same
// values.

import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';

import { getStripe } from '@/lib/montree/stripe';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function planFromMetadata(meta: Stripe.Metadata | null | undefined): 'month' | 'year' | null {
  const p = meta?.montree_dp_plan;
  return p === 'month' || p === 'year' ? p : null;
}

function isoOrNull(seconds: number | null | undefined): string | null {
  return typeof seconds === 'number' && Number.isFinite(seconds)
    ? new Date(seconds * 1000).toISOString()
    : null;
}

async function upsert(row: {
  community_user_id: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  plan?: string | null;
  status: string;
  current_period_end?: string | null;
}): Promise<void> {
  const { error } = await getSupabase()
    .from('montree_dp_subscriptions')
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'community_user_id' });
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      console.warn('[dp/webhook] montree_dp_subscriptions missing — migration 360 not run');
      return;
    }
    throw new Error(`upsert failed: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_DP_WEBHOOK_SECRET;
  if (!secret) {
    // Ships before the secret is configured, exactly like the school webhook:
    // 503 makes Stripe's dashboard say "endpoint not ready" instead of 500.
    console.warn('[dp/webhook] STRIPE_DP_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Dark Phonics billing not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing Stripe-Signature' }, { status: 400 });

  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error('[dp/webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = (s.metadata?.montree_dp_user_id as string | undefined) || s.client_reference_id;
        if (!userId) break; // another product's session
        await upsert({
          community_user_id: userId,
          stripe_customer_id: typeof s.customer === 'string' ? s.customer : (s.customer?.id ?? null),
          stripe_subscription_id:
            typeof s.subscription === 'string' ? s.subscription : (s.subscription?.id ?? null),
          plan: planFromMetadata(s.metadata),
          status: 'active',
        });
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.montree_dp_user_id as string | undefined;
        if (!userId) break;
        await upsert({
          community_user_id: userId,
          stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : (sub.customer?.id ?? null),
          stripe_subscription_id: sub.id,
          plan: planFromMetadata(sub.metadata),
          // A deleted subscription is 'canceled' whatever the object still says.
          status: event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status,
          current_period_end: isoOrNull(
            (sub as unknown as { current_period_end?: number }).current_period_end,
          ),
        });
        break;
      }

      default:
        // Acknowledged and ignored. Stripe retries anything that is not a 2xx.
        break;
    }
  } catch (err) {
    console.error('[dp/webhook] handler failed:', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
