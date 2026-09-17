// tests/feedback/keys.test.ts
//
// The guest identity model in one file. What is asserted here is not "the
// function returns a string" but the three properties the board's privacy
// rests on:
//
//   1. the DATABASE never holds anything replayable as a guest,
//   2. the same guest is recognised across requests,
//   3. without a secret the module fails CLOSED rather than sharing a key
//      space with every other deployment.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  communityKey,
  getFeedbackSecret,
  guestKey,
  guestKeyFromToken,
  hashEmail,
  hashGuestToken,
  hashIp,
  keysEqual,
  newGuestToken,
  normaliseEmail,
  parseKey,
  userKey,
} from '@/lib/montree/feedback/keys';

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env.FEEDBACK_TOKEN_SECRET = 'test-only-feedback-secret-0123456789abcdef';
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('the secret', () => {
  it('prefers its own variable', () => {
    process.env.FEEDBACK_TOKEN_SECRET = 'a'.repeat(40);
    process.env.MONTREE_JWT_SECRET = 'b'.repeat(40);
    expect(getFeedbackSecret()).toBe('a'.repeat(40));
  });

  it('falls back to MONTREE_JWT_SECRET so day one needs no new variable', () => {
    delete process.env.FEEDBACK_TOKEN_SECRET;
    process.env.MONTREE_JWT_SECRET = 'b'.repeat(40);
    expect(getFeedbackSecret()).toBe('b'.repeat(40));
  });

  it('throws rather than hashing with a constant when there is none', () => {
    delete process.env.FEEDBACK_TOKEN_SECRET;
    delete process.env.MONTREE_JWT_SECRET;
    expect(() => getFeedbackSecret()).toThrow(/FEEDBACK_TOKEN_SECRET/);
  });

  it('refuses a secret too short to be a key', () => {
    process.env.FEEDBACK_TOKEN_SECRET = 'short';
    delete process.env.MONTREE_JWT_SECRET;
    expect(() => getFeedbackSecret()).toThrow();
  });
});

describe('guest tokens', () => {
  it('mints 256 bits of hex', () => {
    const token = newGuestToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('never mints the same token twice', () => {
    const seen = new Set(Array.from({ length: 200 }, () => newGuestToken()));
    expect(seen.size).toBe(200);
  });

  it('hashes the same token to the same value, so a guest is recognised', () => {
    const token = newGuestToken();
    expect(hashGuestToken(token)).toBe(hashGuestToken(token));
  });

  it('never stores the token itself — the hash does not contain it', () => {
    const token = newGuestToken();
    const hash = hashGuestToken(token);
    expect(hash).not.toBe(token);
    expect(hash).not.toContain(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('gives a different hash under a different secret, so one leak is not two', () => {
    const token = newGuestToken();
    const a = hashGuestToken(token);
    process.env.FEEDBACK_TOKEN_SECRET = 'a-completely-different-secret-value-here';
    expect(hashGuestToken(token)).not.toBe(a);
  });

  it('builds a guest key straight from a token', () => {
    const token = newGuestToken();
    expect(guestKeyFromToken(token)).toBe(guestKey(hashGuestToken(token)));
  });
});

describe('emails', () => {
  it('normalises before hashing, so Case@X and case@x are one person', () => {
    expect(normaliseEmail('  LIN@Example.COM ')).toBe('lin@example.com');
    expect(hashEmail('  LIN@Example.COM ')).toBe(hashEmail('lin@example.com'));
  });

  it('does not put the address in the hash', () => {
    expect(hashEmail('lin@example.com')).not.toContain('lin');
  });
});

describe('ip hashing', () => {
  it('is stable and short enough for a rate-limit bucket', () => {
    expect(hashIp('203.0.113.9')).toBe(hashIp('203.0.113.9'));
    expect(hashIp('203.0.113.9')).toHaveLength(32);
    expect(hashIp('203.0.113.9')).not.toContain('203');
  });
});

describe('keys', () => {
  it('namespaces the three kinds so they can never collide', () => {
    expect(userKey('abc')).toBe('user:abc');
    expect(communityKey('abc')).toBe('community:abc');
    expect(guestKey('abc')).toBe('guest:abc');
  });

  it('round-trips through parseKey', () => {
    expect(parseKey('user:abc')).toEqual({ kind: 'user', id: 'abc' });
    expect(parseKey('community:abc')).toEqual({ kind: 'community', id: 'abc' });
    expect(parseKey('guest:deadbeef')).toEqual({ kind: 'guest', tokenHash: 'deadbeef' });
  });

  it('rejects anything that is not one of the three', () => {
    expect(parseKey('admin:root')).toBeNull();
    expect(parseKey('user:')).toBeNull();
    expect(parseKey(':abc')).toBeNull();
    expect(parseKey('nonsense')).toBeNull();
  });

  it('compares keys without leaking a timing signal, and never matches null', () => {
    expect(keysEqual('user:a', 'user:a')).toBe(true);
    expect(keysEqual('user:a', 'user:b')).toBe(false);
    expect(keysEqual(null, null)).toBe(false);
    expect(keysEqual('user:a', null)).toBe(false);
    expect(keysEqual(undefined, 'user:a')).toBe(false);
  });
});
