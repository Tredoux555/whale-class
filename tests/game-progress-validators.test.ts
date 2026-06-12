// tests/game-progress-validators.test.ts
// Pure input-sanitising helpers behind /api/games/progress and
// /api/games/track (lib/montree/game-progress.ts). All game payloads are
// client-asserted, so these clamps are the only thing between localStorage
// and the montree_game_progress table.

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  UUID_RE,
  toCount,
  cleanKey,
  capPayload,
  resolveChildId,
} from '@/lib/montree/game-progress';
import { FakeDb } from './helpers/fake-supabase';

afterEach(() => vi.restoreAllMocks());

describe('toCount', () => {
  it('passes sane integers through', () => {
    expect(toCount(7)).toBe(7);
    expect(toCount(0)).toBe(0);
  });

  it('parses numeric strings', () => {
    expect(toCount('42')).toBe(42);
  });

  it('rounds fractional values', () => {
    expect(toCount(3.6)).toBe(4);
  });

  it('clamps negatives to 0 and huge values to the 1e9 cap', () => {
    expect(toCount(-5)).toBe(0);
    expect(toCount(9e12)).toBe(1_000_000_000);
  });

  it('returns null for NaN, Infinity, and non-numeric input', () => {
    expect(toCount('abc')).toBeNull();
    expect(toCount(Infinity)).toBeNull();
    expect(toCount(undefined)).toBeNull();
    expect(toCount({})).toBeNull();
    expect(toCount(null)).toBeNull();
  });
});

describe('cleanKey', () => {
  it('trims and returns the string', () => {
    expect(cleanKey('  letter-trace  ')).toBe('letter-trace');
  });

  it('caps at the given max length', () => {
    expect(cleanKey('a'.repeat(100), 10)).toBe('a'.repeat(10));
  });

  it('returns null for empty / whitespace / non-string input', () => {
    expect(cleanKey('')).toBeNull();
    expect(cleanKey('   ')).toBeNull();
    expect(cleanKey(123)).toBeNull();
    expect(cleanKey(undefined)).toBeNull();
  });
});

describe('capPayload', () => {
  it('passes a small object through unchanged', () => {
    const p = { letters: ['a', 'b'], score: 3 };
    expect(capPayload(p, 'test')).toEqual(p);
  });

  it('rejects non-objects and arrays as {}', () => {
    expect(capPayload('hi', 'test')).toEqual({});
    expect(capPayload([1, 2], 'test')).toEqual({});
    expect(capPayload(null, 'test')).toEqual({});
  });

  it('replaces oversized payloads with a truncation marker', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const big = { blob: 'x'.repeat(9000) };
    const out = capPayload(big, 'test');
    expect(out.truncated).toBe(true);
    expect(out.original_bytes).toBeGreaterThan(8192);
  });
});

describe('resolveChildId', () => {
  const SCHOOL = 'school-A';
  const CHILD = '123e4567-e89b-42d3-a456-426614174000';

  it('UUID_RE accepts a v4 uuid and rejects junk', () => {
    expect(UUID_RE.test(CHILD)).toBe(true);
    expect(UUID_RE.test('child-1')).toBe(false);
  });

  it('returns nulls when no id is sent', async () => {
    const db = new FakeDb();
    const got = await resolveChildId(db.asClient(), undefined, SCHOOL, 'test');
    expect(got).toEqual({ childId: null, rawId: null });
    expect(db.log).toHaveLength(0); // no query for a missing id
  });

  it('keeps a non-UUID id in rawId only (never hits the DB)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const db = new FakeDb();
    const got = await resolveChildId(db.asClient(), 'localstorage-junk', SCHOOL, 'test');
    expect(got).toEqual({ childId: null, rawId: 'localstorage-junk' });
    expect(db.log).toHaveLength(0);
  });

  it('accepts a UUID that exists in the caller school (school-scoped lookup)', async () => {
    const db = new FakeDb().queue('montree_children', { data: { id: CHILD } });
    const got = await resolveChildId(db.asClient(), CHILD, SCHOOL, 'test');
    expect(got).toEqual({ childId: CHILD, rawId: CHILD });
    const q = db.queriesFor('montree_children')[0];
    expect(q.hasCall('eq', 'id', CHILD)).toBe(true);
    expect(q.hasCall('eq', 'school_id', SCHOOL)).toBe(true); // no cross-school forgery
  });

  it('rejects a UUID not found in the school (rawId preserved)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const db = new FakeDb().queue('montree_children', { data: null });
    const got = await resolveChildId(db.asClient(), CHILD, SCHOOL, 'test');
    expect(got).toEqual({ childId: null, rawId: CHILD });
  });

  it('fails closed (childId null) on a lookup error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const db = new FakeDb().queue('montree_children', {
      data: null, error: { message: 'boom' },
    });
    const got = await resolveChildId(db.asClient(), CHILD, SCHOOL, 'test');
    expect(got).toEqual({ childId: null, rawId: CHILD });
  });
});
