// /api/montree/perf/vitals/route.ts
//
// Session 103 Tier 0.12 — Web Vitals collector.
//
// Receives Core Web Vitals metrics from the client via sendBeacon /
// navigator.sendBeacon. Inserts into montree_perf_vitals (migration 196).
//
// Architectural rules:
// - Best-effort: failures NEVER block the response. The client treats this
//   endpoint as fire-and-forget.
// - No auth required. Anyone can post a metric. The downside (spam) is
//   small and bounded by the table indexes; the upside (no auth round-trip
//   on slow networks) is meaningful for the metric we're trying to measure.
//   If this becomes a problem, add a per-IP rate limit later.
// - Graceful degradation when migration 196 hasn't been run yet: returns
//   200 silently so the client doesn't retry-storm.
// - We trust the role + school_id values the client sends. They're for
//   slicing analytics, not authorization. Don't use them for any gate.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';
// Short budget: this is a fire-and-forget DB insert. Don't tie up the runtime.
export const maxDuration = 10;

interface VitalPayload {
  metric: string;
  value: number;
  rating?: string;
  delta?: number;
  role?: string;
  schoolId?: string;
  route?: string;
  userAgent?: string;
  navigationType?: string;
  effectiveConnectionType?: string;
  downlink?: number;
}

const VALID_METRICS = new Set(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);
const VALID_RATINGS = new Set(['good', 'needs-improvement', 'poor']);

function sanitize(payload: VitalPayload) {
  // metric + value are required; everything else is best-effort.
  if (!payload.metric || !VALID_METRICS.has(payload.metric)) return null;
  if (typeof payload.value !== 'number' || !Number.isFinite(payload.value)) return null;

  return {
    metric: payload.metric,
    value: payload.value,
    rating:
      payload.rating && VALID_RATINGS.has(payload.rating) ? payload.rating : null,
    delta:
      typeof payload.delta === 'number' && Number.isFinite(payload.delta)
        ? payload.delta
        : null,
    role: typeof payload.role === 'string' ? payload.role.slice(0, 32) : null,
    school_id:
      typeof payload.schoolId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        payload.schoolId
      )
        ? payload.schoolId
        : null,
    route:
      typeof payload.route === 'string'
        ? payload.route.slice(0, 256)
        : null,
    user_agent:
      typeof payload.userAgent === 'string'
        ? payload.userAgent.slice(0, 512)
        : null,
    navigation_type:
      typeof payload.navigationType === 'string'
        ? payload.navigationType.slice(0, 32)
        : null,
    effective_connection_type:
      typeof payload.effectiveConnectionType === 'string'
        ? payload.effectiveConnectionType.slice(0, 16)
        : null,
    downlink:
      typeof payload.downlink === 'number' && Number.isFinite(payload.downlink)
        ? payload.downlink
        : null,
  };
}

export async function POST(request: NextRequest) {
  let payload: VitalPayload | VitalPayload[] = [];
  try {
    payload = (await request.json()) as VitalPayload | VitalPayload[];
  } catch {
    // Malformed JSON — swallow silently. We're not going to surface client
    // bugs as 4xx responses; the client doesn't retry on failure anyway.
    return NextResponse.json({ ok: true });
  }

  const arr = Array.isArray(payload) ? payload : [payload];
  const rows = arr.map(sanitize).filter((r): r is NonNullable<typeof r> => r !== null);
  if (!rows.length) return NextResponse.json({ ok: true });

  // Best-effort insert. Migration 196 may not be run yet — that case returns
  // 200 silently. Other errors are logged but never surfaced.
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('montree_perf_vitals').insert(rows);
    if (error) {
      // 42P01 = relation does not exist (migration not yet run)
      // Other errors get logged for inspection but we still 200.
      if (error.code !== '42P01') {
        console.warn('[perf/vitals] insert failed:', error.message);
      }
    }
  } catch (err) {
    console.warn('[perf/vitals] unexpected error:', err);
  }

  return NextResponse.json({ ok: true });
}
