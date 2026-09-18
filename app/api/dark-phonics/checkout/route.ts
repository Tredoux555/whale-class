// app/api/dark-phonics/checkout/route.ts
//
// $5/month · $30/year for an individual teacher. POST {plan:'month'|'year'}.
//
// 🚨 SCAFFOLD. Nothing in the UI reaches this route while DARK_PHONICS_PAYWALL
// is 'off', because no lesson is ever locked then and the unlock panel is never
// raised. It is built now so that turning the gate on is a switch rather than a
// sprint — see docs/dark-phonics/HUB.md.
//
// 🚨 IT DOES NOT TOUCH SCHOOL BILLING. The school plan's price ids live in
// getPriceIds() in lib/montree/stripe.ts, which throws when any of the three is
// missing. Extending that function with two more required variables would break
// every school checkout on a deploy where only the school prices are set, so
// Dark Phonics gets its own lazy getter below and its own webhook secret. The
// two products share only getStripe().

import { NextResponse, type NextRequest } from 'next/server';

import { getStripe } from '@/lib/montree/stripe';
import { getCommunityUser } from '@/lib/montree/community/auth';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getSupabase } from '@/lib/supabase-client';
import { isPaywallOn } from '@/lib/montree/dark-phonics/access';

export const dynamic = 'force-dynamic';

export type DpPlan = 'month' | 'year';

/**
 * The two Dark Phonics price ids, read lazily and NEVER at module load.
 *
 * Deliberately separate from getPriceIds(): this throws only when a Dark
 * Phonics checkout is actually invoked, so a deployment with no DP prices set
 * is a 503 on one route instead of a crash on the school funnel.
 */
export function getDpPriceId(plan: DpPlan): string | null {
  const id = plan === 'month' ? process.env.STRIPE_PRICE_DP_MONTH : process.env.STRIPE_PRICE_DP_YEAR;
  return id && id.trim() ? id.trim() : null;
}

export async function POST(request: NextRequest) {
  if (!isPaywallOn()) {
    return NextResponse.json(
      { error: 'Dark Phonics is free right now — nothing to buy.', code: 'paywall_off' },
      { status: 409 },
    );
  }

  let body: { plan?: unknown };
  try {
    body = (await request.json()) as { plan?: unknown };
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const plan: DpPlan | null = body.plan === 'month' || body.plan === 'year' ? body.plan : null;
  if (!plan) return NextResponse.json({ error: 'Choose a monthly or yearly plan.' }, { status: 400 });

  // The individual identity for Dark Phonics is the Teachers' Room account.
  const user = await getCommunityUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Sign in first.', code: 'no_session', signInUrl: '/dark-phonics/account' },
      { status: 401 },
    );
  }

  const supabase = getSupabase();
  const { allowed } = await checkRateLimit(supabase, user.id, '/api/dark-phonics/checkout', 10, 10);
  if (!allowed) return NextResponse.json({ error: 'Too many tries.' }, { status: 429 });

  const price = getDpPriceId(plan);
  if (!price) {
    console.warn('[dp/checkout] STRIPE_PRICE_DP_%s is not set', plan.toUpperCase());
    return NextResponse.json(
      { error: 'Checkout is not configured yet.', code: 'not_configured' },
      { status: 503 },
    );
  }

  try {
    const origin = request.headers.get('origin') || new URL(request.url).origin;
    const stripe = getStripe();

    // Reuse the customer we already made for this teacher, if any — a second
    // customer for the same person makes the portal show half their history.
    const { data: existing } = await supabase
      .from('montree_dp_subscriptions')
      .select('stripe_customer_id')
      .eq('community_user_id', user.id)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      customer: (existing?.stripe_customer_id as string | undefined) || undefined,
      customer_email: existing?.stripe_customer_id ? undefined : user.email,
      client_reference_id: user.id,
      // The webhook reads this, and only this, to know whose subscription it is.
      metadata: { montree_dp_user_id: user.id, montree_dp_plan: plan },
      subscription_data: { metadata: { montree_dp_user_id: user.id, montree_dp_plan: plan } },
      success_url: `${origin}/dark-phonics?checkout=done`,
      cancel_url: `${origin}/dark-phonics?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error('[dp/checkout] stripe failed:', err);
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 502 });
  }
}
