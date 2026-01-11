import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe (will use env vars when set)
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

export async function POST(request: NextRequest) {
  try {
    const { schoolName, email, plan } = await request.json();

    // If Stripe not configured, save lead and return demo mode
    if (!stripe || !process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
      console.log('Stripe not configured - Demo mode');
      console.log('New signup:', { schoolName, email, plan });
      
      // TODO: Save to database as lead
      
      return NextResponse.json({ 
        demo: true,
        message: 'Stripe not configured yet. Lead saved!',
        redirect: '/montree/welcome?demo=true&school=' + encodeURIComponent(schoolName)
      });
    }

    // Get price ID based on plan
    const priceId = plan === 'district' 
      ? process.env.STRIPE_DISTRICT_PRICE_ID 
      : process.env.STRIPE_SCHOOL_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID not configured' },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      metadata: {
        schoolName,
        plan,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          schoolName,
        },
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/montree/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/montree?canceled=true`,
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
