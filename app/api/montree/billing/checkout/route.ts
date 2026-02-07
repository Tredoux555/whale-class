// /api/montree/billing/checkout/route.ts
// Create Stripe checkout session
import { NextRequest, NextResponse } from 'next/server';
import { getStripe, PRICE_IDS } from '@/lib/montree/stripe';
import { getSupabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { school_id, plan } = await request.json();
    
    if (!school_id || !plan) {
      return NextResponse.json({ error: 'Missing school_id or plan' }, { status: 400 });
    }

    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const supabase = getSupabase();
    const stripe = getStripe();

    // Get school info
    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .select('id, name, stripe_customer_id')
      .eq('id', school_id)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Get or create Stripe customer
    let customerId = school.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: school.name,
        metadata: { school_id: school.id },
      });
      customerId = customer.id;

      // Save customer ID
      await supabase
        .from('montree_schools')
        .update({ stripe_customer_id: customerId })
        .eq('id', school_id);
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${appUrl}/montree/admin/billing?success=true`,
      cancel_url: `${appUrl}/montree/admin/billing?canceled=true`,
      metadata: { school_id, plan },
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
