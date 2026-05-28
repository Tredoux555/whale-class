// /api/ping/route.ts
//
// Lightweight keepalive endpoint. Just a 200 OK + timestamp.
//
// Purpose: hit this every 10 minutes from a cron (Railway, GitHub Actions,
// UptimeRobot, etc.) to prevent the Railway container from spinning down
// to a cold state. Cold-start adds 3-7s to the FIRST request after a quiet
// period — disastrous for the login page which is often the first hit
// after a user comes back to montree.xyz.
//
// Distinct from `/api/warm` (which loads the DB pool + AI SDKs + does
// timing). Ping is the cheapest possible endpoint — no DB connection, no
// auth check, no imports beyond NextResponse. It exists ONLY to keep the
// JS runtime warm in memory.
//
// No auth — the response is just `{ ok: true, t: <iso> }`, no sensitive
// data. Public ping endpoints are standard for keepalive crons.
//
// See docs/perf/CRON_SETUP.md section "4. Recurring keepalive ping" for
// the cron schedule + curl command.

import { NextResponse } from 'next/server';

// Force dynamic so the response is never cached at the edge — caching
// defeats the keepalive purpose (the container wouldn't be hit).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// 5s ceiling. /api/ping should always return in <50ms; if it doesn't
// something's wrong with the container itself and we want a clean 504.
export const maxDuration = 5;

export async function GET() {
  return NextResponse.json(
    { ok: true, t: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  );
}

export async function HEAD() {
  // Some cron services prefer HEAD requests (smaller). Same effect — the
  // Node process gets a wake-up either way.
  return new NextResponse(null, {
    status: 200,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
