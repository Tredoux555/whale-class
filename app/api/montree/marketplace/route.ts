// app/api/montree/marketplace/route.ts
// Parent-facing read of the curated home shop. Auth = any logged-in Montree
// user (the shop lives inside the home product). Read-only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { listActiveProducts } from '@/lib/montree/companion/marketplace';

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const query = searchParams.get('q');
  const childId = searchParams.get('child_id');

  let ageYears: number | null = null;
  if (childId) {
    // Only honour the age hint if the child is actually in the caller's school.
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (access.allowed) {
      try {
        const { data: child } = await getSupabase().from('montree_children').select('date_of_birth').eq('id', childId).maybeSingle();
        if (child?.date_of_birth) {
          const dob = new Date(child.date_of_birth as string);
          if (!Number.isNaN(dob.getTime())) ageYears = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        }
      } catch { /* optional */ }
    }
  }

  const products = await listActiveProducts(getSupabase(), { ageYears, category, query });
  return NextResponse.json({ products }, { headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=600' } });
}
