// app/api/montree/companion/schedule/route.ts
//
// GET the family's upcoming schedule (home events + per-child routines) for the
// Home UI's Plan view. Read-only; writes happen through Ivy's tools in the chat.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { listSchedule } from '@/lib/montree/companion/schedule';

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('child_id');
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1), 120);

  if (childId) {
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const now = new Date();
  const to = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  try {
    const result = await listSchedule(getSupabase(), {
      schoolId: auth.schoolId,
      parentId: auth.userId,
      childId: childId || null,
      fromIso: now.toISOString(),
      toIso: to.toISOString(),
    });
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[companion/schedule] GET error:', err);
    return NextResponse.json({ events: [], routines: [] });
  }
}
