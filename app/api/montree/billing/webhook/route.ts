// /api/montree/billing/webhook/route.ts
// Stripe webhook handler
import { NextRequest, NextResponse } from 'next/server';
import { getStripe, PLAN_LIMITS, PlanType } from '@/lib/montree/stripe';
import { getSupabase } from '@/lib/montree/supabase';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getSupabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const schoolId = session.metadata?.school_id;
        const plan = session.metadata?.plan as PlanType;
        
        if (schoolId && plan) {
          await supabase
            .from('montree_schools')
            .update({
              stripe_subscription_id: session.subscription as string,
              subscription_plan: plan,
              subscription_status: 'active',
              max_students: PLAN_LIMITS[plan]?.students || 50,
            })
            .eq('id', schoolId);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        // Find school by customer ID
        const { data: school } = await supabase
          .from('montree_schools')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (school) {
          // Record payment
          await supabase.from('montree_billing_history').insert({
            school_id: school.id,
            stripe_invoice_id: invoice.id,
            amount_cents: invoice.amount_paid,
            currency: invoice.currency,
            status: 'paid',
            description: invoice.description || 'Subscription payment',
            invoice_pdf_url: invoice.invoice_pdf,
          });

          // Update subscription status
          await supabase
            .from('montree_schools')
            .update({
              subscription_status: 'active',
              current_period_end: new Date((invoice.lines.data[0]?.period?.end || 0) * 1000).toISOString(),
            })
            .eq('id', school.id);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        const { data: school } = await supabase
          .from('montree_schools')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (school) {
          await supabase
            .from('montree_schools')
            .update({
              subscription_status: subscription.status as any,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', school.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        const { data: school } = await supabase
          .from('montree_schools')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (school) {
          await supabase
            .from('montree_schools')
            .update({
              subscription_status: 'canceled',
              subscription_plan: 'trial',
              max_students: 50,
            })
            .eq('id', school.id);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
