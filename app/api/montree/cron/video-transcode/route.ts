// app/api/montree/cron/video-transcode/route.ts
//
// Converts teacher-recorded videos that are not iOS-playable into H.264/AAC
// MP4, and gives each one a poster frame so it can enter the work-identification
// pipeline instead of sitting on "Untagged" forever.
//
// WHY IT EXISTS:
// CameraCapture recorded `video/webm;codecs=vp9` until Session 2026-09.
// iOS Safari and QuickTime cannot decode VP9/Opus at all, so every clip already
// in the bucket is unplayable on an iPhone and stays that way — capture-side
// fixes only help future recordings. This route walks the backlog. It is also
// the safety net for the fire-and-forget transcode kicked off by
// /api/montree/media/upload, which can be lost to a cold shutdown.
//
// Hit it from cron-job.org exactly like the other montree crons:
//   POST https://montree.xyz/api/montree/cron/video-transcode
//   header: x-cron-secret: <CRON_SECRET>
//
// 🚨 FAIL-CLOSED AUTH: transcoding burns CPU on the shared web dyno and the
// identification step spends Anthropic credit, so it requires x-cron-secret to
// match process.env.CRON_SECRET EXACTLY. Missing env or missing/wrong header →
// 401. No super-admin fallback — this must never run from a browser session.
//
// 🚨 SPEND IS BOUNDED: MAX_PER_RUN rows per call, processed SEQUENTIALLY (each
// ffmpeg run is already CPU-bound; parallelising would starve request traffic).
// Call it repeatedly to drain a backlog.
//
// NODE RUNTIME — lib/montree/media/transcode.ts shells out to ffmpeg.

import { NextRequest, NextResponse } from 'next/server';
import { runTranscodeSweep } from '@/lib/montree/media/transcode-sweep';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_PER_RUN = 5;

// 🚨 THE QUEUE LOGIC LIVES IN ONE PLACE (2026-09-19). This route used to carry
// its own scan + loop; the in-process sweep (instrumentation.ts) now runs the
// same drain every 5 minutes, and two divergent copies of "which rows are
// eligible" is how a row ends up processed twice or never. Both call
// runTranscodeSweep(), which CLAIMS each row with a conditional UPDATE — so
// this route firing while a sweep is mid-pass is correct, not a race.
//
// The identification hand-off that used to live here is gone: photo
// recognition was retired 2026-09-17 (see CLAUDE.md), so it was dead code
// behind a flag that is permanently off.
export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || !cronSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const counts = await runTranscodeSweep(MAX_PER_RUN);
  return NextResponse.json({ success: true, counts });
}
