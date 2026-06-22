// app/api/story/coach-billing/portal/route.ts
//
// Lyf Coach — open the Stripe Customer Portal (manage card, cancel, invoices).
// Space is sourced ONLY from the verified story-admin token.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, getAdminSpace } from '@/lib/story-db';
import { createCoachPortalSession } from '@/lib/story/coach/billing';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const admin = await verifyAdminToken(auth);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(auth);
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const result = await createCoachPortalSession(supabase, space);

  if (!result.configured) {
    return NextResponse.json({ error: 'Billing is not set up yet.', detail: result.reason }, { status: 503 });
  }
  if (!result.ok || !result.data) {
    return NextResponse.json({ error: 'Could not open billing.', detail: result.reason }, { status: 502 });
  }
  return NextResponse.json({ portal_url: result.data.portal_url });
}
