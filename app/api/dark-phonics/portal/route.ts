// app/api/dark-phonics/portal/route.ts
//
// "Manage my subscription" — a Stripe billing-portal session for the signed-in
// Teachers' Room account. POST, no body.
//
// 🚨 SCAFFOLD, like its two siblings: with DARK_PHONICS_PAYWALL off nobody has
// a subscription and nothing links here. It exists so that the day the gate is
// switched on there is already a way OUT of it — a paywall with no cancel
// button is a complaint, not a product.
//
// The customer id comes from our own row, never from the request: a caller who
// could name a customer id could open somebody else's billing portal.

import { NextResponse, type NextRequest } from 'next/server';

import { getStripe } from '@/lib/montree/stripe';
import { getCommunityUser } from '@/lib/montree/community/auth';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCommunityUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Sign in first.', code: 'no_session' }, { status: 401 });
  }

  const { data, error } = await getSupabase()
    .from('montree_dp_subscriptions')
    .select('stripe_customer_id')
    .eq('community_user_id', user.id)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return NextResponse.json({ error: 'Not set up yet.', code: 'migration_pending' }, { status: 503 });
    }
    console.error('[dp/portal] lookup failed:', error.message);
    return NextResponse.json({ error: 'Could not open the portal.' }, { status: 500 });
  }

  const customer = data?.stripe_customer_id as string | undefined;
  if (!customer) {
    return NextResponse.json({ error: 'No subscription to manage.', code: 'no_subscription' }, { status: 404 });
  }

  try {
    const origin = request.headers.get('origin') || new URL(request.url).origin;
    const session = await getStripe().billingPortal.sessions.create({
      customer,
      return_url: `${origin}/dark-phonics`,
    });
    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error('[dp/portal] stripe failed:', err);
    return NextResponse.json({ error: 'Could not open the portal.' }, { status: 502 });
  }
}
