// app/api/montree/photo-identification/sweep/route.ts
//
// Recovery sweep for photo identification.
//
// Called on Photo Audit page load. Returns a list of stuck media_ids
// (up to SWEEP_CAP) that the client should fire /process for in its own
// background loop. This keeps the sweep request itself fast (<1s) and lets
// each /process call live in its own request lifecycle rather than nesting
// them serially inside a single long-lived HTTP call.
//
// "Stuck" = identification_status IS NULL / 'pending' / 'failed'
//           AND (identification_attempted_at IS NULL OR older than 5 min).
//
// The attempted_at freshness gate is applied in JS after the initial query
// because chaining multiple .or() filters in PostgREST is not reliably ANDed
// across versions — safer to do one .or() in SQL and filter in memory.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

const SWEEP_CAP = 20;           // how many media_ids we return to the client
const OVERSCAN = 80;            // fetch more from DB so JS filter still has headroom
const STALE_MINUTES = 5;

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (!auth.classroomId) {
    return NextResponse.json({ success: true, media_ids: [] });
  }

  const supabase = getSupabase();
  const staleCutoffMs = Date.now() - STALE_MINUTES * 60_000;

  const { data: candidates, error } = await supabase
    .from('montree_media')
    .select('id, identification_status, identification_attempted_at')
    .eq('school_id', auth.schoolId)
    .eq('classroom_id', auth.classroomId)
    .eq('media_type', 'photo')
    .or('identification_status.is.null,identification_status.eq.pending,identification_status.eq.failed')
    .order('created_at', { ascending: false })
    .limit(OVERSCAN);

  if (error) {
    console.error('[PhotoIdSweep] Query failed:', error);
    return NextResponse.json({ error: 'Sweep query failed' }, { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ success: true, media_ids: [] });
  }

  // JS filter: keep only rows where attempted_at is null or stale
  const stuckIds: string[] = [];
  for (const row of candidates) {
    const attempted = row.identification_attempted_at
      ? Date.parse(row.identification_attempted_at)
      : 0;
    if (!attempted || attempted < staleCutoffMs) {
      stuckIds.push(row.id);
      if (stuckIds.length >= SWEEP_CAP) break;
    }
  }

  return NextResponse.json({ success: true, media_ids: stuckIds });
}
