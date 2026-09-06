// tests/security/super-admin-secret.test.ts
//
// Guards the fix to lib/verify-super-admin.ts.
//
// getSuperAdminTokenSecret() used to fall back:
//
//     SUPER_ADMIN_JWT_SECRET || SUPER_ADMIN_PASSWORD || ADMIN_SECRET
//
// so in production the super-admin session JWTs were signed with the login
// PASSWORD. An HMAC key must be high-entropy: anyone who captures a single
// super-admin token can brute-force the key offline — no rate limit, no alert —
// and recovering it yields both the ability to forge platform-wide super-admin
// tokens AND the login password itself. ADMIN_SECRET was no better: it also
// signs ordinary teacher sessions, so the two systems shared a key.
//
// The function now REQUIRES a dedicated, long, distinct secret and throws
// otherwise, so the failure is loud instead of quiet.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSuperAdminTokenSecret } from '@/lib/verify-super-admin';

const GOOD = 'K7pQ2vX9mZ4nR8sT1wY6bC3dF5gH0jL2aE4uI7oP9kM1'; // 44 chars, distinct
const PASSWORD = 'correct-horse-battery-staple';
const ADMIN_SECRET = 'test-only-admin-secret-do-not-use-in-prod-0987654321';

const ORIGINAL = { ...process.env };

beforeEach(() => {
  delete process.env.SUPER_ADMIN_JWT_SECRET;
  delete process.env.SUPER_ADMIN_PASSWORD;
  delete process.env.ADMIN_SECRET;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('getSuperAdminTokenSecret', () => {
  it('returns the dedicated secret when it is properly set', () => {
    process.env.SUPER_ADMIN_JWT_SECRET = GOOD;
    expect(new TextDecoder().decode(getSuperAdminTokenSecret())).toBe(GOOD);
  });

  it('THROWS rather than falling back to SUPER_ADMIN_PASSWORD', () => {
    // This is the whole fix. Before, this returned the password as the key.
    process.env.SUPER_ADMIN_PASSWORD = PASSWORD;
    expect(() => getSuperAdminTokenSecret()).toThrow(/SUPER_ADMIN_JWT_SECRET is required/);
  });

  it('THROWS rather than falling back to ADMIN_SECRET', () => {
    // ADMIN_SECRET also signs teacher sessions — sharing it across the two
    // systems means one leak compromises both.
    process.env.ADMIN_SECRET = ADMIN_SECRET;
    expect(() => getSuperAdminTokenSecret()).toThrow(/SUPER_ADMIN_JWT_SECRET is required/);
  });

  it('THROWS when nothing at all is configured (fails closed)', () => {
    expect(() => getSuperAdminTokenSecret()).toThrow(/SUPER_ADMIN_JWT_SECRET is required/);
  });

  it('rejects a secret short enough to brute-force offline', () => {
    process.env.SUPER_ADMIN_JWT_SECRET = 'short-and-guessable';
    expect(() => getSuperAdminTokenSecret()).toThrow(/too short/);
  });

  it('accepts a secret exactly at the 32-character floor', () => {
    const exact = 'a'.repeat(32);
    process.env.SUPER_ADMIN_JWT_SECRET = exact;
    expect(new TextDecoder().decode(getSuperAdminTokenSecret())).toBe(exact);
  });

  it('rejects reusing the login password as the signing key', () => {
    // Long enough to pass the length check, but re-creates the original flaw.
    const reused = PASSWORD.repeat(2);
    process.env.SUPER_ADMIN_JWT_SECRET = reused;
    process.env.SUPER_ADMIN_PASSWORD = reused;
    expect(() => getSuperAdminTokenSecret()).toThrow(/must not reuse another secret/);
  });

  it('rejects reusing ADMIN_SECRET as the signing key', () => {
    process.env.SUPER_ADMIN_JWT_SECRET = ADMIN_SECRET;
    process.env.ADMIN_SECRET = ADMIN_SECRET;
    expect(() => getSuperAdminTokenSecret()).toThrow(/must not reuse another secret/);
  });

  it('allows a distinct secret even when the other two are also set', () => {
    process.env.SUPER_ADMIN_JWT_SECRET = GOOD;
    process.env.SUPER_ADMIN_PASSWORD = PASSWORD;
    process.env.ADMIN_SECRET = ADMIN_SECRET;
    expect(() => getSuperAdminTokenSecret()).not.toThrow();
  });
});
