// app/api/montree/companion/placement/route.ts
// GET ?child_id=… → { has_profile } — gates the First Meeting placement flow on
// Montree Home. A child with no mental profile gets the guided placement chat;
// once the profile exists (via /api/montree/children/[childId]/onboard) the gate
// never shows again.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const childId = (request.nextUrl.searchParams.get('child_id') || '').trim();
  if (!childId) return NextResponse.json({ error: 'child_id required' }, { status: 400 });

  const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
  if (!access.allowed) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const supabase = getSupabase();
  try {
    const { data } = await supabase
      .from('montree_child_mental_profiles')
      .select('id')
      .eq('child_id', childId)
      .maybeSingle();
    return NextResponse.json(
      { success: true, has_profile: !!data },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (err) {
    console.error('[companion/placement] error:', err);
    // Fail open — never trap a family behind the gate on a transient error.
    return NextResponse.json({ success: true, has_profile: true });
  }
}
