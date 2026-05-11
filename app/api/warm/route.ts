// /api/warm/route.ts
// Tier 0.14 — Post-deploy pre-warm.
//
// Calls the heavy AI-bound routes once with a no-op probe to warm their
// serverless containers. Run this once after a Railway redeploy (via cron or
// the deploy hook) so the FIRST real user request doesn't eat the cold-start
// 5-10s penalty.
//
// Auth: x-cron-secret header equal to CRON_SECRET env. Same pattern as
// billing/sync-quantity + payouts/calculate.
//
// What it warms:
//   1. DB connection (single SELECT 1 query)
//   2. Anthropic SDK module load (no API call — just imports the client)
//   3. OpenAI SDK module load
//   4. The auth verifier path (verifySchoolRequest does cookie parse + JWT verify)
//
// What it does NOT do: actual AI calls (those cost real money). The point is
// to warm the JS module cache + DB pool, not to test inference.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface WarmStep {
  name: string;
  ok: boolean;
  ms: number;
  error?: string;
}

async function timed(name: string, fn: () => Promise<unknown>): Promise<WarmStep> {
  const t0 = Date.now();
  try {
    await fn();
    return { name, ok: true, ms: Date.now() - t0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name, ok: false, ms: Date.now() - t0, error: msg };
  }
}

export async function GET(request: NextRequest) {
  // Auth: cron-secret OR allow unauthenticated only in dev. Production
  // deployments should pass the header so the route can't be spammed.
  const cronSecret = request.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET || '';
  const allowUnauthenticated = process.env.NODE_ENV !== 'production';

  if (!allowUnauthenticated) {
    if (!expected || cronSecret !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const t0 = Date.now();
  const steps: WarmStep[] = [];

  // 1. DB pool warm — single trivial query.
  steps.push(
    await timed('db-ping', async () => {
      const supabase = getSupabase();
      // Cheap query — covered by an existing index, no scan.
      const { error } = await supabase
        .from('montree_schools')
        .select('id')
        .limit(1);
      if (error) throw new Error(error.message);
    })
  );

  // 2. Anthropic SDK module warm — dynamic import so we don't bloat the cold
  //    bundle of OTHER routes. We just want the V8 module cache populated.
  steps.push(
    await timed('anthropic-sdk-import', async () => {
      await import('@anthropic-ai/sdk');
    })
  );

  // 3. OpenAI SDK module warm. Some heavy routes (Whisper, language-semester)
  //    import this lazily.
  steps.push(
    await timed('openai-sdk-import', async () => {
      await import('openai');
    })
  );

  // 4. Stripe SDK module warm — Phase 4 billing routes import this.
  steps.push(
    await timed('stripe-sdk-import', async () => {
      await import('stripe');
    })
  );

  const totalMs = Date.now() - t0;
  const allOk = steps.every((s) => s.ok);

  return NextResponse.json(
    {
      ok: allOk,
      total_ms: totalMs,
      steps,
    },
    { status: allOk ? 200 : 500 }
  );
}
