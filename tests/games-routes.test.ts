// tests/games-routes.test.ts
// Route-handler tests for /api/games/progress (both payload shapes the 9
// games actually send) and /api/games/track. Supabase + auth are mocked —
// these tests pin down the request-validation, tenant-scoping, and
// child-resolution behaviour, not the DB.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { FakeDb } from './helpers/fake-supabase';

vi.mock('@/lib/supabase-client', () => ({ getSupabase: vi.fn() }));
vi.mock('@/lib/montree/verify-request', () => ({ verifySchoolRequest: vi.fn() }));

import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { POST as progressPOST } from '@/app/api/games/progress/route';
import { POST as trackPOST } from '@/app/api/games/track/route';

const SCHOOL = 'school-A';
const CHILD = '123e4567-e89b-42d3-a456-426614174000';
const SESSION = '88888888-4444-4444-8444-cccccccccccc';

const teacherAuth = {
  userId: 'teacher-1', schoolId: SCHOOL, classroomId: 'class-1', role: 'teacher' as const,
};

function req(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}
const badJsonReq = () =>
  ({ json: async () => { throw new SyntaxError('bad json'); } } as unknown as NextRequest);

let db: FakeDb;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  db = new FakeDb();
  vi.mocked(getSupabase).mockReturnValue(db.asClient() as ReturnType<typeof getSupabase>);
  vi.mocked(verifySchoolRequest).mockResolvedValue(teacherAuth);
});

describe('POST /api/games/progress — auth gates', () => {
  it('passes the 401 through when unauthenticated', async () => {
    const deny = NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    vi.mocked(verifySchoolRequest).mockResolvedValue(deny);
    const res = await progressPOST(req({ game_id: 'x' }));
    expect(res.status).toBe(401);
  });

  it('rejects agent sessions with 403', async () => {
    vi.mocked(verifySchoolRequest).mockResolvedValue({ ...teacherAuth, role: 'agent' });
    const res = await progressPOST(req({ game_id: 'x' }));
    expect(res.status).toBe(403);
  });

  it('returns 400 for an unparsable JSON body', async () => {
    const res = await progressPOST(badJsonReq());
    expect(res.status).toBe(400);
  });
});

describe('POST /api/games/progress — shape A (session start/end)', () => {
  it('start: 400 when gameId is missing', async () => {
    const res = await progressPOST(req({ action: 'start', childId: CHILD }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('gameId is required');
  });

  it('start: inserts a school-scoped session row and returns its id', async () => {
    db.queue('montree_children', { data: { id: CHILD } });
    db.queue('montree_game_progress', { data: { id: SESSION } });
    const res = await progressPOST(
      req({ action: 'start', childId: CHILD, gameId: 'letter-trace', gameName: 'Letter Trace' })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, sessionId: SESSION });
    const row = db.queriesFor('montree_game_progress')[0].firstArg('insert') as Record<string, unknown>;
    expect(row.school_id).toBe(SCHOOL); // from the JWT, never the client
    expect(row.child_id).toBe(CHILD);
    expect(row.game_key).toBe('letter-trace');
    expect(row.event_type).toBe('session');
  });

  it('start: an unverifiable child id lands in payload.client_child_id, not child_id', async () => {
    db.queue('montree_children', { data: null }); // not in this school
    db.queue('montree_game_progress', { data: { id: SESSION } });
    const res = await progressPOST(
      req({ action: 'start', childId: CHILD, gameId: 'letter-trace' })
    );
    expect(res.status).toBe(200);
    const row = db.queriesFor('montree_game_progress')[0].firstArg('insert') as {
      child_id: unknown; payload: Record<string, unknown>;
    };
    expect(row.child_id).toBeNull();
    expect(row.payload.client_child_id).toBe(CHILD);
  });

  it('end: 400 for a non-UUID sessionId', async () => {
    const res = await progressPOST(req({ action: 'end', sessionId: 'nope' }));
    expect(res.status).toBe(400);
  });

  it('end: 404 when the session is not found in the caller school', async () => {
    db.queue('montree_game_progress', { data: null });
    const res = await progressPOST(req({ action: 'end', sessionId: SESSION }));
    expect(res.status).toBe(404);
    const lookup = db.queriesFor('montree_game_progress')[0];
    expect(lookup.hasCall('eq', 'school_id', SCHOOL)).toBe(true); // cross-tenant close impossible
  });

  it('end: updates the row with results, duration, and school scoping', async () => {
    const startedAt = new Date(Date.now() - 10_000).toISOString();
    db.queue('montree_game_progress',
      { data: { id: SESSION, started_at: startedAt, payload: { client_child_id: 'kept' } } },
      { data: null } // update result
    );
    const res = await progressPOST(req({
      action: 'end', sessionId: SESSION,
      itemsCompleted: 5, itemsTotal: 8, itemsMastered: ['a', 'b'],
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, sessionId: SESSION });
    const update = db.queriesFor('montree_game_progress')[1];
    const row = update.firstArg('update') as Record<string, unknown>;
    expect(row.items_correct).toBe(5);
    expect(row.items_total).toBe(8);
    expect(row.time_spent_seconds).toBe(10);
    expect(row.completed).toBe(true);
    expect((row.payload as Record<string, unknown>).items_mastered).toEqual(['a', 'b']);
    expect((row.payload as Record<string, unknown>).client_child_id).toBe('kept'); // merged, not lost
    expect(update.hasCall('eq', 'school_id', SCHOOL)).toBe(true);
  });
});

describe('POST /api/games/progress — shape B (completion save)', () => {
  it('400 when game_id is missing', async () => {
    const res = await progressPOST(req({ student_id: CHILD, items_correct: 3 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('game_id is required');
  });

  it('saves a school-scoped progress row with clamped counts', async () => {
    db.queue('montree_children', { data: { id: CHILD } });
    db.queue('montree_game_progress', { data: null });
    const res = await progressPOST(req({
      student_id: CHILD, game_id: 'word-builder', time_spent_seconds: 33.4,
      items_attempted: 10, items_correct: -2, high_score: '120',
      completed: true, session_data: { round: 2 },
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, saved: true });
    const row = db.queriesFor('montree_game_progress')[0].firstArg('insert') as Record<string, unknown>;
    expect(row.school_id).toBe(SCHOOL);
    expect(row.child_id).toBe(CHILD);
    expect(row.event_type).toBe('progress');
    expect(row.items_attempted).toBe(10);
    expect(row.items_correct).toBe(0);   // negative clamped
    expect(row.score).toBe(120);         // numeric string coerced
    expect(row.time_spent_seconds).toBe(33); // rounded
    expect(row.completed).toBe(true);
    expect(row.payload).toEqual({ round: 2 });
  });

  it('500 with a clean error when the insert fails', async () => {
    db.queue('montree_children', { data: { id: CHILD } });
    db.queue('montree_game_progress', { data: null, error: { message: 'no table', code: '42P01' } });
    const res = await progressPOST(req({ student_id: CHILD, game_id: 'word-builder' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Failed to save progress');
  });
});

describe('POST /api/games/track', () => {
  it('rejects agent sessions with 403', async () => {
    vi.mocked(verifySchoolRequest).mockResolvedValue({ ...teacherAuth, role: 'agent' });
    const res = await trackPOST(req({ game_id: 'quantity-match' }));
    expect(res.status).toBe(403);
  });

  it('400 when game_id is missing', async () => {
    const res = await trackPOST(req({ score: 5 }));
    expect(res.status).toBe(400);
  });

  it('tracks a classroom-level row (child_id null, school from JWT)', async () => {
    db.queue('montree_game_progress', { data: null });
    const res = await trackPOST(req({
      game_id: 'quantity-match', mode: 'easy', score: 9, xp_earned: 14, streak: 3, completed: true,
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, tracked: true });
    const row = db.queriesFor('montree_game_progress')[0].firstArg('insert') as Record<string, unknown>;
    expect(row.school_id).toBe(SCHOOL);
    expect(row.child_id).toBeNull();
    expect(row.event_type).toBe('track');
    expect(row.score).toBe(9);
    expect(row.payload).toEqual({ mode: 'easy', xp_earned: 14, streak: 3 });
  });
});
