// app/api/games/progress/route.ts
// Jun 12, 2026 — the 9 learning games have POSTed here since they were built,
// but the route never existed: every save 404'd and was swallowed client-side
// (FUNCTIONALITY-whale-frontend audit, 1.1). This implements EXACTLY the two
// payload shapes the existing game clients already send — no client changes.
//
// Shape A — session protocol (LetterTraceGame / CapitalLetterTraceGame /
// NumberTraceGame components):
//   POST { action: 'start', childId, gameId, gameName }
//     → { ok, sessionId }   (sessionId = montree_game_progress row id)
//   POST { action: 'end', sessionId, childId?, gameId?, gameName?,
//          itemsCompleted, itemsTotal, itemsMastered }
//     → { ok, sessionId }   (updates the started row with results)
//
// Shape B — completion save (match-attack-new, read-and-reveal,
// word-builder-new, sentence-scramble, sound-safari pages):
//   POST { student_id, game_id, time_spent_seconds, items_attempted,
//          items_correct, high_score?, completed, session_data }
//     → { ok, saved: true }
//
// Auth: these games all live inside the teacher-authenticated dashboard
// (/montree/dashboard/games/*), so the montree-auth httpOnly cookie rides
// along on the same-origin fetch. verifySchoolRequest scopes every write to
// the caller's school. There is no anonymous path — an unauthenticated POST
// gets a 401 (which the games already tolerate silently), so no anonymous
// rate limiting is needed.
//
// Child ids come from localStorage ('current_student_id' / 'studentSession'),
// i.e. they are client-asserted. We validate them against montree_children
// WITHIN the caller's school; ids that don't check out are NOT written to
// child_id (no cross-school forgery) — they're preserved in
// payload.client_child_id with a logged warning so nothing fails silently.

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import {
  UUID_RE,
  toCount,
  cleanKey,
  capPayload,
  resolveChildId,
} from '@/lib/montree/game-progress';

// montree_game_progress (migration 252) isn't in the generated DB types yet —
// untyped-client cast, same contract as push/register/route.ts.
const db = (): SupabaseClient => getSupabase() as unknown as SupabaseClient;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth; // 401
    if (auth.role === 'agent') {
      // Agents have no classroom/game surface; their schoolId is inert.
      console.warn('[games/progress] agent session rejected');
      return NextResponse.json({ error: 'Not available for agents' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const supabase = db();

    // ---------- Shape A: trace-game session protocol ----------
    if (body.action === 'start' || body.action === 'end') {
      if (body.action === 'start') {
        const gameKey = cleanKey(body.gameId);
        if (!gameKey) {
          return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
        }
        const { childId, rawId } = await resolveChildId(
          supabase, body.childId, auth.schoolId, 'games/progress'
        );
        const payload: Record<string, unknown> = {};
        if (rawId && !childId) payload.client_child_id = rawId;

        const { data, error } = await supabase
          .from('montree_game_progress')
          .insert({
            school_id: auth.schoolId,
            child_id: childId,
            game_key: gameKey,
            game_name: cleanKey(body.gameName, 128),
            event_type: 'session',
            payload,
            started_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (error || !data) {
          const hint = (error as { code?: string } | null)?.code === '42P01'
            ? ' (run migrations/252_game_progress.sql)'
            : '';
          console.error(`[games/progress] session start insert failed${hint}:`, error?.message);
          return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
        }
        return NextResponse.json({ ok: true, sessionId: data.id });
      }

      // action === 'end'
      const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
      if (!UUID_RE.test(sessionId)) {
        return NextResponse.json({ error: 'Valid sessionId is required' }, { status: 400 });
      }

      // Re-read the started row (school-scoped — a session id can never be
      // closed across tenants) so we can compute duration + merge payload.
      const { data: existing, error: readError } = await supabase
        .from('montree_game_progress')
        .select('id, started_at, payload')
        .eq('id', sessionId)
        .eq('school_id', auth.schoolId)
        .eq('event_type', 'session')
        .maybeSingle();

      if (readError) {
        console.error('[games/progress] session lookup failed:', readError.message);
        return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
      }
      if (!existing) {
        console.warn(`[games/progress] end for unknown session ${sessionId} (school ${auth.schoolId})`);
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const endedAt = new Date();
      const startedAt = existing.started_at ? new Date(existing.started_at as string) : null;
      const timeSpent = startedAt
        ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000))
        : null;

      const itemsMastered = Array.isArray(body.itemsMastered)
        ? (body.itemsMastered as unknown[]).slice(0, 200).map((x) => String(x).slice(0, 64))
        : undefined;

      const mergedPayload: Record<string, unknown> = {
        ...((existing.payload as Record<string, unknown>) || {}),
      };
      if (itemsMastered) mergedPayload.items_mastered = itemsMastered;

      const { error: updateError } = await supabase
        .from('montree_game_progress')
        .update({
          items_correct: toCount(body.itemsCompleted),
          items_total: toCount(body.itemsTotal),
          time_spent_seconds: timeSpent,
          completed: true,
          ended_at: endedAt.toISOString(),
          payload: mergedPayload,
        })
        .eq('id', sessionId)
        .eq('school_id', auth.schoolId);

      if (updateError) {
        console.error('[games/progress] session end update failed:', updateError.message);
        return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, sessionId });
    }

    // ---------- Shape B: completion save ----------
    const gameKey = cleanKey(body.game_id);
    if (!gameKey) {
      return NextResponse.json({ error: 'game_id is required' }, { status: 400 });
    }

    const { childId, rawId } = await resolveChildId(
      supabase, body.student_id, auth.schoolId, 'games/progress'
    );
    const payload = capPayload(body.session_data, 'games/progress');
    if (rawId && !childId) payload.client_child_id = rawId;

    const { error } = await supabase.from('montree_game_progress').insert({
      school_id: auth.schoolId,
      child_id: childId,
      game_key: gameKey,
      event_type: 'progress',
      items_attempted: toCount(body.items_attempted),
      items_correct: toCount(body.items_correct),
      score: toCount(body.high_score),
      time_spent_seconds: toCount(body.time_spent_seconds),
      completed: body.completed === true,
      payload,
      ended_at: new Date().toISOString(),
    });

    if (error) {
      const hint = (error as { code?: string }).code === '42P01'
        ? ' (run migrations/252_game_progress.sql)'
        : '';
      console.error(`[games/progress] insert failed${hint}:`, error.message);
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, saved: true });
  } catch (e) {
    console.error('[games/progress] unexpected error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
