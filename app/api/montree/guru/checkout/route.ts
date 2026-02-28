// app/api/montree/guru/checkout/route.ts
// Creates a Stripe Checkout session for Guru subscription
// Tiers: haiku ($5/mo, 30 prompts), sonnet ($20/mo, 30 prompts)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { getStripe } from '@/lib/montree/stripe';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

// Map tier → env var name for Stripe price ID
const TIER_PRICE_ENV: Record<string, string> = {
  haiku: 'STRIPE_PRICE_GURU_HAIKU',
  sonnet: 'STRIPE_PRICE_GURU_SONNET',
};

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const requestedTier = (body.tier as string) || 'haiku';

    // Validate tier
    if (!['haiku', 'sonnet'].includes(requestedTier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tier. Choose haiku or sonnet.' },
        { status: 400 }
      );
    }

    // Get price ID for requested tier — no cross-tier fallback to avoid billing wrong amount
    const tierEnvVar = TIER_PRICE_ENV[requestedTier];
    const priceId = process.env[tierEnvVar];
    if (!priceId) {
      console.error(`[Guru Checkout] Missing env var ${tierEnvVar} for tier ${requestedTier}`);
      return NextResponse.json(
        { success: false, error: `Guru billing not configured for ${requestedTier} tier` },
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

    // Only homeschool parents need to pay — teachers get Guru for free
    if (t.role !== 'homeschool_parent') {
      return NextResponse.json({
        success: false,
        error: 'You already have unlimited Guru access as a teacher.',
      }, { status: 400 });
    }

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
        guru_tier: requestedTier,
        child_count: String(quantity),
      },
      subscription_data: {
        metadata: {
          teacher_id: auth.userId,
          type: 'guru_subscription',
          guru_tier: requestedTier,
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
