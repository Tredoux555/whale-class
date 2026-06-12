// app/api/games/track/route.ts
// Jun 12, 2026 — quantity-match has POSTed its completion ping here since it
// was built, but the route never existed (FUNCTIONALITY-whale-frontend audit,
// 1.1). Implements exactly what the client sends — no client changes.
//
//   POST { game_id, mode, score, xp_earned, streak, completed }
//     → { ok, tracked: true }
//
// Note: this payload carries NO child/student id — quantity-match tracks at
// classroom level only, so rows land with child_id NULL.
//
// Auth: same as /api/games/progress — the game lives inside the
// teacher-authenticated dashboard, the montree-auth cookie rides along on the
// same-origin fetch, and verifySchoolRequest scopes the write to the caller's
// school. No anonymous path → no anonymous rate limiting needed.

import { NextRequest, NextResponse } from 'next/server';
import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { toCount, cleanKey } from '@/lib/montree/game-progress';

// montree_game_progress (migration 252) isn't in the generated DB types yet —
// untyped-client cast, same contract as push/register/route.ts.
const db = (): SupabaseClient => getSupabase() as unknown as SupabaseClient;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth; // 401
    if (auth.role === 'agent') {
      console.warn('[games/track] agent session rejected');
      return NextResponse.json({ error: 'Not available for agents' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const gameKey = cleanKey(body.game_id);
    if (!gameKey) {
      return NextResponse.json({ error: 'game_id is required' }, { status: 400 });
    }

    const { error } = await db().from('montree_game_progress').insert({
      school_id: auth.schoolId,
      child_id: null,
      game_key: gameKey,
      event_type: 'track',
      score: toCount(body.score),
      completed: body.completed === true,
      payload: {
        mode: cleanKey(body.mode, 32),
        xp_earned: toCount(body.xp_earned),
        streak: toCount(body.streak),
      },
      ended_at: new Date().toISOString(),
    });

    if (error) {
      const hint = (error as { code?: string }).code === '42P01'
        ? ' (run migrations/252_game_progress.sql)'
        : '';
      console.error(`[games/track] insert failed${hint}:`, error.message);
      return NextResponse.json({ error: 'Failed to track progress' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, tracked: true });
  } catch (e) {
    console.error('[games/track] unexpected error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
