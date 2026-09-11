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
import { getSupabase } from '@/lib/supabase-client';
import { transcodeVideoMedia, isIosPlayableContainer } from '@/lib/montree/media/transcode';
import { triggerIdentification } from '@/lib/montree/media/identify-trigger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_PER_RUN = 5;
const SCAN_LIMIT = 50;

interface Row {
  id: string;
  school_id: string;
  classroom_id: string | null;
  child_id: string | null;
  event_id: string | null;
  work_id: string | null;
  storage_path: string;
  playback_path: string | null;
  transcode_status: string | null;
}

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || !cronSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const counts = { scanned: 0, eligible: 0, transcoded: 0, identified: 0, failed: 0 };
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  try {
    // Oldest first. 'processing' and 'failed' are deliberately NOT re-offered:
    // 'processing' may be a run still in flight, and a clip that ffmpeg cannot
    // decode will not start decoding on the 40th attempt. Re-drive those by
    // clearing transcode_status in SQL.
    const { data, error } = await supabase
      .from('montree_media')
      .select('id, school_id, classroom_id, child_id, event_id, work_id, storage_path, playback_path, transcode_status')
      .eq('media_type', 'video')
      .is('playback_path', null)
      .is('archived_at', null)
      .or('transcode_status.is.null,transcode_status.eq.pending')
      .order('created_at', { ascending: true })
      .limit(SCAN_LIMIT);

    if (error) {
      console.error('[VideoTranscode] scan failed:', error.message);
      return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
    }

    const rows = (data || []) as Row[];
    counts.scanned = rows.length;

    // Anything already in an iOS-playable container needs no ffmpeg pass — just
    // point playback_path at the original so the feed stops guessing.
    const queue: Row[] = [];
    for (const row of rows) {
      if (isIosPlayableContainer(row.storage_path)) {
        await supabase
          .from('montree_media')
          .update({ playback_path: row.storage_path, transcode_status: 'done' })
          .eq('id', row.id);
        continue;
      }
      queue.push(row);
      if (queue.length >= MAX_PER_RUN) break;
    }
    counts.eligible = queue.length;

    const origin = request.nextUrl.origin;

    for (const row of queue) {
      const result = await transcodeVideoMedia(row.id);
      results.push({ id: row.id, ok: result.ok, error: result.error });
      if (!result.ok) {
        counts.failed++;
        continue;
      }
      counts.transcoded++;

      // Now that a poster frame exists, let the video into the same
      // work-identification pipeline photos use (it reads thumbnail_path for
      // video rows). Event captures and hand-tagged rows are excluded, exactly
      // as on the photo path.
      if (result.posterPath && !row.event_id && !row.work_id) {
        const ok = await triggerIdentification({
          mediaId: row.id,
          schoolId: row.school_id,
          classroomId: row.classroom_id,
          origin,
          subject: 'cron:video-transcode',
        });
        if (ok) counts.identified++;
      }
    }

    return NextResponse.json({ success: true, counts, results });
  } catch (err) {
    console.error('[VideoTranscode] run failed:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
