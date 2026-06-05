// /api/story/cron/expire-media/route.ts
//
// Sweeps Story MEDIA past its 24-hour TTL and hard-deletes it (row + the
// story-uploads object). Media-only — text messages and the secret_stories
// weekly note are never touched. See lib/story/media-retention.ts.
//
// Schedule via Railway cron, hourly (TTL precision is then ±1h):
//   0 * * * *
//   curl -X POST 'https://montree.xyz/api/story/cron/expire-media' \
//     -H "x-cron-secret: $CRON_SECRET"
//
// Auth: x-cron-secret OR a Story admin Bearer token (so an admin can trigger a
// sweep by hand from the dashboard). Add ?dry_run=1 to count without deleting.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/story-db';
import { verifyStoryAdminToken } from '@/lib/story/story-admin-auth';
import { deleteExpiredStoryMedia, getMediaTtlHours } from '@/lib/story/media-retention';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let authed = false;

  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;
  if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
    authed = true;
  }
  if (!authed) {
    const admin = await verifyStoryAdminToken(req.headers.get('authorization'));
    if (admin) authed = true;
  }
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = new URL(req.url).searchParams.get('dry_run') === '1';

  const supabase = getSupabase();
  const result = await deleteExpiredStoryMedia(supabase, { dryRun });

  if (result.errors.length > 0) {
    console.error('[cron expire-media] completed with errors:', result.errors);
  }

  return NextResponse.json({
    ok: result.errors.length === 0,
    ttlHours: getMediaTtlHours(),
    ...result,
  });
}
