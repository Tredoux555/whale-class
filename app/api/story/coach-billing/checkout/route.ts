// app/api/story/coach-billing/checkout/route.ts
//
// Lyf Coach — start a Stripe Checkout to convert trial → paid ($14.99/mo or
// $99/yr). Space is sourced ONLY from the verified story-admin token, never the
// client (cross-pollination contract — one space can never bill as another).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, getAdminSpace } from '@/lib/story-db';
import { createCoachCheckoutSession, type CoachCadence } from '@/lib/story/coach/billing';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const admin = await verifyAdminToken(auth);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(auth);
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let cadence: CoachCadence = 'monthly';
  try {
    const body = await request.json();
    if (body?.cadence === 'annual') cadence = 'annual';
  } catch {
    /* no body → monthly default */
  }

  const supabase = getSupabase();
  const result = await createCoachCheckoutSession(supabase, space, { cadence });

  if (!result.configured) {
    return NextResponse.json({ error: 'Billing is not set up yet.', detail: result.reason }, { status: 503 });
  }
  if (!result.ok || !result.data) {
    return NextResponse.json({ error: 'Could not start checkout.', detail: result.reason }, { status: 502 });
  }
  return NextResponse.json({ checkout_url: result.data.checkout_url, cadence: result.data.cadence });
}
