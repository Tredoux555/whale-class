// app/api/montree/guru/checkout/route.ts
// Creates a Stripe Checkout session for Guru subscription ($5/month per child)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { getStripe } from '@/lib/montree/stripe';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const priceId = process.env.STRIPE_PRICE_GURU_MONTHLY;
    if (!priceId) {
      return NextResponse.json(
        { success: false, error: 'Guru billing not configured' },
        { status: 503 }
      );
    }

    const supabase = getSupabase();
    const stripe = getStripe();

    // Get teacher info
    const { data: teacher } = await supabase
      .from('montree_teachers')
      .select('id, name, email, role, guru_stripe_customer_id')
      .eq('id', auth.userId)
      .single();

    if (!teacher) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const t = teacher as Record<string, unknown>;

    // Get or create Stripe customer
    let customerId = t.guru_stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: (t.email as string) || undefined,
        name: t.name as string,
        metadata: {
          teacher_id: t.id as string,
          type: 'guru_subscription',
        },
      });
      customerId = customer.id;
      await (supabase.from('montree_teachers') as ReturnType<typeof supabase.from>)
        .update({ guru_stripe_customer_id: customerId })
        .eq('id', auth.userId);
    }

    // Count children for quantity-based billing
    const { count: childCount } = await supabase
      .from('montree_children')
      .select('id', { count: 'exact', head: true })
      .eq('classroom_id', auth.classroomId || '');

    const quantity = Math.max(1, childCount || 1);

    // Create Checkout session
    const origin = request.headers.get('origin') || 'https://montree.xyz';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity,
      }],
      success_url: `${origin}/montree/dashboard/guru?upgrade=success`,
      cancel_url: `${origin}/montree/dashboard/guru?upgrade=cancel`,
      metadata: {
        teacher_id: auth.userId,
        type: 'guru_subscription',
        child_count: String(quantity),
      },
      subscription_data: {
        metadata: {
          teacher_id: auth.userId,
          type: 'guru_subscription',
        },
      },
    });

    return NextResponse.json({
      success: true,
      checkout_url: session.url,
    });

  } catch (error) {
    console.error('[Guru Checkout] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create checkout' }, { status: 500 });
  }
}
