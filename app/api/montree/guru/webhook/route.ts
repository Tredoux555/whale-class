// app/api/montree/guru/webhook/route.ts
// Stripe webhook handler for Guru subscriptions
// Handles: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { getStripe } from '@/lib/montree/stripe';
import Stripe from 'stripe';

// Stripe sends raw body — Next.js needs this to verify signatures
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_GURU;
  if (!webhookSecret) {
    console.error('[Guru Webhook] STRIPE_WEBHOOK_SECRET_GURU not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const stripe = getStripe();
  const supabase = getSupabase();

  // Read raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[Guru Webhook] Signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Only handle guru subscriptions
        if (session.metadata?.type !== 'guru_subscription') break;

        const teacherId = session.metadata?.teacher_id;
        if (!teacherId) break;

        const subscriptionId = session.subscription as string;

        // Fetch subscription details for period end
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        // Extract and validate tier from checkout metadata
        const rawTier = session.metadata?.guru_tier;
        const guruTier = (rawTier === 'haiku' || rawTier === 'sonnet') ? rawTier : 'sonnet';
        if (!rawTier) {
          console.warn(`[Guru Webhook] Missing guru_tier in checkout metadata for teacher ${teacherId}, defaulting to sonnet`);
        }

        const checkoutUpdateResult = await (supabase.from('montree_teachers') as ReturnType<typeof supabase.from>)
          .update({
            guru_plan: 'paid',
            guru_tier: guruTier,
            guru_stripe_subscription_id: subscriptionId,
            guru_subscription_status: 'active',
            guru_current_period_end: periodEnd,
            guru_prompts_used: 0, // Reset prompts on new subscription
            guru_prompts_reset_at: new Date().toISOString(),
          })
          .eq('id', teacherId);

        if (checkoutUpdateResult.error) {
          console.error(`[Guru Webhook] CRITICAL: Failed to update teacher ${teacherId} on checkout.session.completed:`, checkoutUpdateResult.error);
        } else {
          console.log(`[Guru Webhook] Checkout completed for teacher ${teacherId}, tier: ${guruTier}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any;

        // Only handle guru subscriptions
        if (subscription.metadata?.type !== 'guru_subscription') break;

        const teacherId = subscription.metadata?.teacher_id;
        if (!teacherId) break;

        const status = subscription.status as string; // active, past_due, canceled, unpaid, etc.
        const isActive = status === 'active' || status === 'trialing';
        const guruTier = subscription.metadata?.guru_tier;

        // Check if this is a period renewal (reset monthly prompts)
        const updateData: Record<string, unknown> = {
          guru_plan: isActive ? 'paid' : 'free',
          guru_subscription_status: status,
          guru_current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        };

        if (guruTier) updateData.guru_tier = guruTier;

        // Reset prompt counter on each new billing period
        if (isActive) {
          updateData.guru_prompts_used = 0;
          updateData.guru_prompts_reset_at = new Date().toISOString();
        }

        const subscriptionUpdateResult = await (supabase.from('montree_teachers') as ReturnType<typeof supabase.from>)
          .update(updateData)
          .eq('id', teacherId);

        if (subscriptionUpdateResult.error) {
          console.error(`[Guru Webhook] CRITICAL: Failed to update teacher ${teacherId} on customer.subscription.updated:`, subscriptionUpdateResult.error);
        } else {
          console.log(`[Guru Webhook] Subscription updated for teacher ${teacherId}: ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any;

        if (subscription.metadata?.type !== 'guru_subscription') break;

        const teacherId = subscription.metadata?.teacher_id;
        if (!teacherId) break;

        const deleteUpdateResult = await (supabase.from('montree_teachers') as ReturnType<typeof supabase.from>)
          .update({
            guru_plan: 'free',
            guru_subscription_status: 'canceled',
            guru_current_period_end: null,
          })
          .eq('id', teacherId);

        if (deleteUpdateResult.error) {
          console.error(`[Guru Webhook] CRITICAL: Failed to update teacher ${teacherId} on customer.subscription.deleted:`, deleteUpdateResult.error);
        } else {
          console.log(`[Guru Webhook] Subscription canceled for teacher ${teacherId}`);
        }
        break;
      }

      default:
        // Ignore unhandled event types
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Guru Webhook] Processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
