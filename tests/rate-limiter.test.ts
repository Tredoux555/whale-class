// tests/rate-limiter.test.ts
// lib/rate-limiter.ts — the database-backed auth rate limiter. Locks in the
// M2 hardening: callers guarding credentials pass failMode:'closed' so a
// limiter-backend error DENIES (allowed:false) rather than letting brute
// force run unmetered. The default 'open' mode is also pinned (allows on
// error) so nothing that relied on the old behaviour silently changed.
// Supabase is the in-memory FakeDb — no network, no env vars.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FakeDb } from './helpers/fake-supabase';
import { checkRateLimit } from '@/lib/rate-limiter';

const IP = '203.0.113.7';
const ENDPOINT = '/api/story/admin/vault/unlock';
const TABLE = 'montree_rate_limit_logs';

let db: FakeDb;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  db = new FakeDb();
});

describe('checkRateLimit — normal operation (under / over the limit)', () => {
  it('allows when the count is under the limit', async () => {
    db.queue(TABLE, { count: 2, error: null }); // count query
    db.queue(TABLE, { error: null });           // insert
    const r = await checkRateLimit(db.asClient(), IP, ENDPOINT, 5, 15, 'closed');
    expect(r.allowed).toBe(true);
  });

  it('logs the attempt (insert) only when allowed', async () => {
    db.queue(TABLE, { count: 0, error: null });
    db.queue(TABLE, { error: null });
    await checkRateLimit(db.asClient(), IP, ENDPOINT, 5, 15, 'closed');
    const inserts = db.queriesFor(TABLE).filter((q) =>
      q.calls.some(([m]) => m === 'insert')
    );
    expect(inserts).toHaveLength(1);
    const row = inserts[0].firstArg('insert') as Record<string, unknown>;
    expect(row.key).toBe(IP);
    expect(row.endpoint).toBe(ENDPOINT);
  });

  it('denies (allowed:false) when the count is AT the limit', async () => {
    db.queue(TABLE, { count: 5, error: null });
    const r = await checkRateLimit(db.asClient(), IP, ENDPOINT, 5, 15, 'closed');
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSeconds).toBe(15 * 60);
  });

  it('denies when the count is OVER the limit, and does not log another attempt', async () => {
    db.queue(TABLE, { count: 99, error: null });
    const r = await checkRateLimit(db.asClient(), IP, ENDPOINT, 5, 15, 'closed');
    expect(r.allowed).toBe(false);
    // No insert once we are already over — the count query is the only call.
    const inserts = db.queriesFor(TABLE).filter((q) =>
      q.calls.some(([m]) => m === 'insert')
    );
    expect(inserts).toHaveLength(0);
  });

  it('scopes the count query to this IP + endpoint within the window', async () => {
    db.queue(TABLE, { count: 0, error: null });
    db.queue(TABLE, { error: null });
    await checkRateLimit(db.asClient(), IP, ENDPOINT, 5, 15, 'closed');
    const countQuery = db.queriesFor(TABLE)[0];
    expect(countQuery.hasCall('eq', 'key', IP)).toBe(true);
    expect(countQuery.hasCall('eq', 'endpoint', ENDPOINT)).toBe(true);
    expect(countQuery.calls.some(([m]) => m === 'gte')).toBe(true);
  });
});

describe('checkRateLimit — fail-CLOSED (M2 hardening)', () => {
  it('DENIES on a count-query backend error', async () => {
    db.queue(TABLE, { count: null, error: { message: 'connection refused', code: '500' } });
    const r = await checkRateLimit(db.asClient(), IP, ENDPOINT, 5, 15, 'closed');
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSeconds).toBe(60);
  });

  it('DENIES when the count query throws (unexpected error path)', async () => {
    const throwingDb = {
      from() {
        throw new Error('supabase exploded');
      },
    } as unknown as ReturnType<FakeDb['asClient']>;
    const r = await checkRateLimit(throwingDb, IP, ENDPOINT, 5, 15, 'closed');
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSeconds).toBe(60);
  });

  it('a backend error CANNOT fail open when failMode is closed', async () => {
    // The whole point of M2 — no error shape should yield allowed:true here.
    db.queue(TABLE, { count: null, error: { message: 'pool timeout' } });
    const r = await checkRateLimit(db.asClient(), IP, ENDPOINT, 5, 15, 'closed');
    expect(r.allowed).not.toBe(true);
  });
});

describe('checkRateLimit — fail-OPEN (default) still allows on error', () => {
  it('defaults to fail-open when no failMode is passed', async () => {
    db.queue(TABLE, { count: null, error: { message: 'down' } });
    const r = await checkRateLimit(db.asClient(), IP, ENDPOINT, 5, 15);
    expect(r.allowed).toBe(true);
  });

  it('explicit failMode:open allows on a backend error', async () => {
    db.queue(TABLE, { count: null, error: { message: 'down' } });
    const r = await checkRateLimit(db.asClient(), IP, ENDPOINT, 5, 15, 'open');
    expect(r.allowed).toBe(true);
  });

  it('fail-open still enforces a real over-limit count (error-free)', async () => {
    db.queue(TABLE, { count: 10, error: null });
    const r = await checkRateLimit(db.asClient(), IP, ENDPOINT, 5, 15, 'open');
    expect(r.allowed).toBe(false);
  });
});
