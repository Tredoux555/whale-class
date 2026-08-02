// app/api/montree/cron/photo-sweep/route.ts
//
// The recovery sweep the pipeline has always referred to as "(Future)".
//
// WHY IT EXISTS:
// A photo's identification is triggered by a fire-and-forget `fetch(...,
// {keepalive:true})` from the capture page. If that request never lands — tab
// closed mid-navigation, network drop, iOS backgrounding the PWA — the photo
// sits unprocessed. Until now the ONLY recovery was a teacher happening to
// open Wrap Up, which runs the in-app sweep. Nothing ran on a schedule, so a
// dropped photo could stay unidentified indefinitely with no signal anywhere.
//
// Hit it hourly from cron-job.org, exactly like the engagement cron:
//   POST https://montree.xyz/api/montree/cron/photo-sweep
//   header: x-cron-secret: <CRON_SECRET>
//
// 🚨 FAIL-CLOSED AUTH: spends Anthropic credit, so it requires x-cron-secret to
// match process.env.CRON_SECRET exactly. Missing env or missing/wrong header →
// 401. No super-admin fallback — this must never run from a browser session.
//
// 🚨 SPEND IS BOUNDED, deliberately, in four independent ways:
//   1. RECENT_WINDOW_DAYS — only photos captured recently are retried. A photo
//      that has been failing for two weeks will not start succeeding because we
//      tried a 300th time; it is surfaced in the digest instead.
//   2. RETRY_AFTER_MINUTES — a photo is retried at most ~4x/day.
//      identification_attempted_at is stamped by the process route itself at
//      the START of every attempt, so this is honoured even on hard failures.
//   3. MAX_PER_RUN / MAX_PER_SCHOOL — one broken school cannot eat the budget.
//   4. Videos are excluded. media_type='video' rows sit at the 'pending'
//      default forever by design (identification is photo-only); they are NOT
//      stuck and must never be fed to Haiku.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { createMontreeToken } from '@/lib/montree/server-auth';
import { logServerError } from '@/lib/montree/server-errors';
import { POST as processPost } from '@/app/api/montree/photo-identification/process/route';

export const maxDuration = 300;

const RECENT_WINDOW_DAYS = 14;
const RETRY_AFTER_MINUTES = 360; // 6h
const MAX_PER_RUN = 40;
const MAX_PER_SCHOOL = 10;
const CONCURRENCY = 3;
const CANDIDATE_SCAN_LIMIT = 500;

// Digest alarm thresholds. Tuned to be quiet: a couple of unreadable photos in
// a day is normal classroom life, a quarter of them failing is not.
const ALERT_MIN_SAMPLE = 8;
const ALERT_FAILURE_RATE = 0.25;
const ALERT_BACKLOG = 50;

interface MediaRow {
  id: string;
  school_id: string;
  classroom_id: string | null;
  identification_status: string | null;
  identification_attempted_at: string | null;
  captured_at: string | null;
}

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || !cronSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const now = Date.now();
  const recentCutoff = new Date(now - RECENT_WINDOW_DAYS * 86400_000).toISOString();
  const staleBefore = now - RETRY_AFTER_MINUTES * 60_000;

  const counts = {
    scanned: 0,
    eligible: 0,
    attempted: 0,
    recovered: 0,
    still_failing: 0,
    skipped_too_old: 0,
    errors: 0,
  };

  try {
    // ── 1. Find photos the pipeline never finished ───────────────────────────
    // work_id IS NULL matters: a photo a teacher has already tagged by hand is
    // finished as far as the classroom is concerned, whatever its status says.
    const { data: candidates, error: scanErr } = await supabase
      .from('montree_media')
      .select('id, school_id, classroom_id, identification_status, identification_attempted_at, captured_at')
      .eq('media_type', 'photo')
      .is('event_id', null)
      .is('work_id', null)
      .in('identification_status', ['pending', 'failed'])
      .order('captured_at', { ascending: false })
      .limit(CANDIDATE_SCAN_LIMIT);

    if (scanErr) {
      logServerError({
        origin: 'cron/photo-sweep',
        message: `candidate scan failed: ${scanErr.message}`,
        severity: 'error',
      }, supabase);
      return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
    }

    const rows = (candidates || []) as MediaRow[];
    counts.scanned = rows.length;

    const perSchool = new Map<string, number>();
    const queue: MediaRow[] = [];

    for (const r of rows) {
      if (queue.length >= MAX_PER_RUN) break;
      if (!r.captured_at || r.captured_at < recentCutoff) {
        counts.skipped_too_old++;
        continue;
      }
      const attempted = r.identification_attempted_at
        ? Date.parse(r.identification_attempted_at)
        : 0;
      if (attempted && attempted > staleBefore) continue; // tried recently, let it be
      const used = perSchool.get(r.school_id) || 0;
      if (used >= MAX_PER_SCHOOL) continue;
      perSchool.set(r.school_id, used + 1);
      queue.push(r);
    }
    counts.eligible = queue.length;

    // ── 2. Re-run each one through the real pipeline ─────────────────────────
    // In-process invocation, same pattern as photo-identification/batch (the
    // Railway SSL loopback issue makes an HTTP self-call unreliable). There is
    // no teacher session here, so we mint a 60-second server-internal token
    // scoped to that photo's OWN school — it never leaves this process.
    const origin = request.nextUrl.origin;
    let cursor = 0;

    async function worker() {
      while (cursor < queue.length) {
        const row = queue[cursor++];
        counts.attempted++;
        try {
          const token = await createMontreeToken(
            {
              sub: `cron:photo-sweep`,
              schoolId: row.school_id,
              classroomId: row.classroom_id || undefined,
              role: 'principal',
            },
            { ttlSeconds: 60 },
          );

          const synthetic = new NextRequest(
            new URL('/api/montree/photo-identification/process', origin),
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ media_id: row.id, force: true }),
            },
          );

          const res = await processPost(synthetic as unknown as NextRequest);
          if (res.ok) counts.recovered++;
          else counts.still_failing++;
        } catch (err) {
          counts.errors++;
          console.error('[PhotoSweep] photo failed:', row.id, err);
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()),
    );

    // ── 3. Daily digest — would anyone notice if this broke for everyone? ────
    const since = new Date(now - 86400_000).toISOString();
    const { data: recent } = await supabase
      .from('montree_media')
      .select('identification_status')
      .eq('media_type', 'photo')
      .gte('captured_at', since)
      .limit(2000);

    const byStatus: Record<string, number> = {};
    for (const r of (recent || []) as Array<{ identification_status: string | null }>) {
      const k = r.identification_status || 'null';
      byStatus[k] = (byStatus[k] || 0) + 1;
    }
    const sample = (recent || []).length;
    const failed24h = byStatus['failed'] || 0;
    const failureRate = sample > 0 ? failed24h / sample : 0;

    const alarms: string[] = [];
    if (sample >= ALERT_MIN_SAMPLE && failureRate >= ALERT_FAILURE_RATE) {
      alarms.push(
        `photo identification is failing for ${Math.round(failureRate * 100)}% of the last 24h (${failed24h}/${sample})`,
      );
    }
    if (counts.skipped_too_old >= ALERT_BACKLOG) {
      alarms.push(
        `${counts.skipped_too_old} photos are older than ${RECENT_WINDOW_DAYS} days and still unidentified`,
      );
    }

    if (alarms.length > 0) {
      // Lands on the super-admin Health dashboard, which previously could not
      // see a pipeline outage at all.
      logServerError({
        origin: 'cron/photo-sweep',
        message: `Photo pipeline health: ${alarms.join('; ')}`,
        severity: 'error',
        context: { counts, by_status_24h: byStatus, sample },
      }, supabase);
    }

    return NextResponse.json({
      success: true,
      counts,
      last_24h: { sample, by_status: byStatus, failure_rate: Number(failureRate.toFixed(3)) },
      alarms,
    });
  } catch (err) {
    logServerError({
      origin: 'cron/photo-sweep',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack || null : null,
      severity: 'fatal',
      context: { counts },
    });
    console.error('[PhotoSweep] run failed:', err);
    return NextResponse.json({ error: 'Sweep failed', counts }, { status: 500 });
  }
}
