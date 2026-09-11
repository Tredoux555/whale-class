// app/api/montree/media/transcode-now/route.ts
//
// "Convert N clips now" — the teacher-facing twin of
// /api/montree/cron/video-transcode.
//
// WHY IT EXISTS: Montage Studio greys out every clip that has no
// playback_path ("converting…"), because the worker cannot cut a VP9/Opus
// WebM. The cron drains that backlog eventually, but a teacher standing in
// front of a class at 15:40 wanting today's film cannot wait for eventually.
// This lets her push the oldest few through herself.
//
//   POST { media_ids?: uuid[] }
//     → { ok, counts: { eligible, transcoded, failed, remaining }, results }
//
// 🚨 AUTH is the ordinary teacher/principal session (verifySchoolRequest),
// NOT the cron secret — but everything it can touch is SCHOOL-SCOPED: the
// scan is filtered on auth.schoolId and an explicit media_ids list only
// NARROWS that, so one school can never spend CPU on another's backlog.
//
// 🚨 SPEND IS BOUNDED exactly like the cron: MAX_PER_CALL rows, processed
// SEQUENTIALLY (ffmpeg is CPU-bound; parallelising starves request traffic),
// plus a per-school rate limit so a client polling this endpoint cannot pin
// the web dyno. Call it repeatedly to drain a backlog.
//
// NODE RUNTIME — lib/montree/media/transcode.ts shells out to ffmpeg.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { transcodeVideoMedia, isIosPlayableContainer } from '@/lib/montree/media/transcode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Same ceiling as the cron's MAX_PER_RUN — one ffmpeg pass each, in series. */
const MAX_PER_CALL = 5;
const SCAN_LIMIT = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --- rate limit -----------------------------------------------------------
// The repo has no shared limiter helper, and this endpoint should not grow a
// dependency for one counter. In-memory, per school, per process: a throttle
// on a polling client, not a security boundary (the real bound is
// MAX_PER_CALL plus the school scope above).
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_CALLS = 6;
const rateBuckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  now = Date.now(),
  windowMs = RATE_WINDOW_MS,
  maxCalls = RATE_MAX_CALLS
): { allowed: boolean; retryAfterSec: number } {
  const hits = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= maxCalls) {
    rateBuckets.set(key, hits);
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)),
    };
  }
  hits.push(now);
  rateBuckets.set(key, hits);
  // Opportunistic sweep so a long-lived process cannot grow this map forever.
  if (rateBuckets.size > 500) {
    for (const [k, v] of rateBuckets) {
      if (v.every((t) => now - t >= windowMs)) rateBuckets.delete(k);
    }
  }
  return { allowed: true, retryAfterSec: 0 };
}

interface Row {
  id: string;
  storage_path: string;
  playback_path: string | null;
  transcode_status: string | null;
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const limit = checkRateLimit(`transcode-now:${auth.schoolId}`);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: 'Too many conversion requests — try again shortly.',
        retry_after: limit.retryAfterSec,
      },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    );
  }

  // Body is optional: no body at all means "the oldest few of my school's".
  let requestedIds: string[] | null = null;
  const body = await request.json().catch(() => null);
  if (body && typeof body === 'object' && (body as Record<string, unknown>).media_ids != null) {
    const raw = (body as Record<string, unknown>).media_ids;
    if (!Array.isArray(raw)) {
      return NextResponse.json({ error: 'media_ids must be an array' }, { status: 400 });
    }
    const ids = raw.filter((v): v is string => typeof v === 'string' && UUID_RE.test(v));
    if (ids.length !== raw.length) {
      return NextResponse.json({ error: 'media_ids must all be uuids' }, { status: 400 });
    }
    requestedIds = [...new Set(ids)];
  }

  const supabase = getSupabase();
  const counts = { eligible: 0, transcoded: 0, failed: 0, remaining: 0 };
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  try {
    // 🚨 school_id is NOT optional here — it is the tenant boundary.
    let scan = supabase
      .from('montree_media')
      .select('id, storage_path, playback_path, transcode_status')
      .eq('school_id', auth.schoolId)
      .eq('media_type', 'video')
      .is('playback_path', null)
      .is('archived_at', null)
      .or('transcode_status.is.null,transcode_status.eq.pending,transcode_status.eq.failed')
      .order('created_at', { ascending: true })
      .limit(SCAN_LIMIT);
    if (requestedIds) scan = scan.in('id', requestedIds.slice(0, SCAN_LIMIT));

    const { data, error } = await scan;
    if (error) {
      // Pre-354 school: no playback_path / transcode_status column at all.
      if (error.code === '42703' || error.code === '42P01') {
        return NextResponse.json({ error: 'video playback is not set up yet' }, { status: 503 });
      }
      console.error('[transcode-now] scan failed:', error.message);
      return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
    }

    const rows = (data || []) as Row[];

    // An mp4/mov that was never marked needs no ffmpeg pass — just point
    // playback_path at the original (identical to the cron's shortcut).
    const queue: Row[] = [];
    for (const row of rows) {
      if (isIosPlayableContainer(row.storage_path)) {
        await supabase
          .from('montree_media')
          .update({ playback_path: row.storage_path, transcode_status: 'done' })
          .eq('id', row.id)
          .eq('school_id', auth.schoolId);
        counts.transcoded++;
        results.push({ id: row.id, ok: true });
        continue;
      }
      queue.push(row);
      if (queue.length >= MAX_PER_CALL) break;
    }
    counts.eligible = queue.length;

    for (const row of queue) {
      const result = await transcodeVideoMedia(row.id);
      results.push({ id: row.id, ok: result.ok, error: result.error });
      if (result.ok) counts.transcoded++;
      else counts.failed++;
    }

    // What the Studio's progress line counts down.
    const { count } = await supabase
      .from('montree_media')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', auth.schoolId)
      .eq('media_type', 'video')
      .is('playback_path', null)
      .is('archived_at', null);
    counts.remaining = count ?? 0;

    return NextResponse.json({ ok: true, counts, results });
  } catch (err) {
    console.error('[transcode-now] run failed:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
