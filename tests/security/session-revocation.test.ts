// tests/security/session-revocation.test.ts
//
// Guards the fix in migrations/351_session_revocation.sql +
// lib/montree/session-revocation.ts + the sign-out-everywhere route.
//
// Before: a Montree session was a stateless signed JWT with a 3650-day life and
// NO way to end it. /api/montree/auth/logout cleared the cookie on one device;
// the same token pasted anywhere else kept working for ten years. A stolen
// phone, a sold laptop or a login code shared with someone who left the school
// could only be answered by rotating MONTREE_JWT_SECRET — which signs out every
// teacher, principal and parent in every school simultaneously.
//
// After: each identity row carries `sessions_revoked_at`, and any token issued
// before that instant is refused.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const NOW_S = Math.floor(Date.now() / 1000);

/** What the fake DB currently reports per table+id. */
let revokedAtByKey: Record<string, string | null> = {};
/** Force the DB layer to fail, to prove the fail-open contract. */
let dbFails = false;
let selectCount = 0;

vi.mock('@/lib/supabase-client', () => ({
  getSupabase: () => ({
    from(table: string) {
      const b: Record<string, unknown> = {
        select: () => b,
        eq: (_c: string, v: unknown) => {
          (b as { _id?: unknown })._id = v;
          return b;
        },
        maybeSingle: async () => {
          selectCount++;
          if (dbFails) return { data: null, error: { message: 'boom' } };
          const key = `${table}:${(b as { _id?: unknown })._id}`;
          return {
            data: { sessions_revoked_at: revokedAtByKey[key] ?? null },
            error: null,
          };
        },
      };
      return b;
    },
  }),
}));

const {
  isSessionRevoked,
  invalidateSessionRevocation,
  tableForRole,
} = await import('@/lib/montree/session-revocation');

beforeEach(() => {
  revokedAtByKey = {};
  dbFails = false;
  selectCount = 0;
  invalidateSessionRevocation();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('tableForRole', () => {
  it('maps each role to the table its token sub actually lives in', () => {
    expect(tableForRole('teacher')).toBe('montree_teachers');
    expect(tableForRole('agent')).toBe('montree_teachers');
    expect(tableForRole('homeschool_parent')).toBe('montree_teachers');
    expect(tableForRole('principal')).toBe('montree_school_admins');
    expect(tableForRole('org_admin')).toBe('montree_organization_admins');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('isSessionRevoked', () => {
  it('an ordinary session with nothing revoked is allowed', async () => {
    expect(await isSessionRevoked('teacher', 't1', NOW_S)).toBe(false);
  });

  it('REVOKES a token issued before sessions_revoked_at — the whole point', async () => {
    // Account signed out everywhere one minute ago; this token is an hour old.
    revokedAtByKey['montree_teachers:t1'] = new Date((NOW_S - 60) * 1000).toISOString();
    expect(await isSessionRevoked('teacher', 't1', NOW_S - 3600)).toBe(true);
  });

  it('does NOT revoke a token issued after the revocation (the fresh login)', async () => {
    revokedAtByKey['montree_teachers:t1'] = new Date((NOW_S - 3600) * 1000).toISOString();
    expect(await isSessionRevoked('teacher', 't1', NOW_S)).toBe(false);
  });

  it('revokes a principal via montree_school_admins, not the teachers table', async () => {
    revokedAtByKey['montree_school_admins:p1'] = new Date(NOW_S * 1000).toISOString();
    expect(await isSessionRevoked('principal', 'p1', NOW_S - 100)).toBe(true);
    // A teacher with the same id is untouched.
    expect(await isSessionRevoked('teacher', 'p1', NOW_S - 100)).toBe(false);
  });

  it('revokes one account without touching another', async () => {
    revokedAtByKey['montree_teachers:t1'] = new Date(NOW_S * 1000).toISOString();
    expect(await isSessionRevoked('teacher', 't1', NOW_S - 100)).toBe(true);
    expect(await isSessionRevoked('teacher', 't2', NOW_S - 100)).toBe(false);
  });

  it('FAILS OPEN when the database errors — an outage must not log the world out', async () => {
    dbFails = true;
    expect(await isSessionRevoked('teacher', 't1', NOW_S - 100)).toBe(false);
  });

  it('fails open for a token with no readable iat', async () => {
    revokedAtByKey['montree_teachers:t1'] = new Date(NOW_S * 1000).toISOString();
    expect(await isSessionRevoked('teacher', 't1', undefined)).toBe(false);
  });

  it('caches, so the hot path costs at most one SELECT per account per window', async () => {
    await isSessionRevoked('teacher', 't1', NOW_S);
    await isSessionRevoked('teacher', 't1', NOW_S);
    await isSessionRevoked('teacher', 't1', NOW_S);
    expect(selectCount).toBe(1);
  });

  it('does not cache an error result — the next request retries', async () => {
    dbFails = true;
    await isSessionRevoked('teacher', 't1', NOW_S);
    dbFails = false;
    revokedAtByKey['montree_teachers:t1'] = new Date(NOW_S * 1000).toISOString();
    expect(await isSessionRevoked('teacher', 't1', NOW_S - 100)).toBe(true);
  });

  it('invalidateSessionRevocation makes a revocation visible immediately', async () => {
    expect(await isSessionRevoked('teacher', 't1', NOW_S - 100)).toBe(false); // cached "clean"
    revokedAtByKey['montree_teachers:t1'] = new Date(NOW_S * 1000).toISOString();
    expect(await isSessionRevoked('teacher', 't1', NOW_S - 100)).toBe(false); // still cached
    invalidateSessionRevocation('teacher', 't1');
    expect(await isSessionRevoked('teacher', 't1', NOW_S - 100)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('migration 351', () => {
  it('adds sessions_revoked_at to all three identity tables', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const sql = readFileSync(
      join(__dirname, '..', '..', 'migrations', '351_session_revocation.sql'),
      'utf8'
    );
    for (const t of [
      'montree_teachers',
      'montree_school_admins',
      'montree_organization_admins',
    ]) {
      expect(
        new RegExp(
          `ALTER TABLE ${t}\\s+ADD COLUMN IF NOT EXISTS sessions_revoked_at timestamptz`,
          'i'
        ).test(sql),
        `351 should add the column to ${t}`
      ).toBe(true);
    }
  });

  it('ships a dry run before it alters anything', async () => {
    // Same contract as 350: look before you leap.
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const sql: string = readFileSync(
      join(__dirname, '..', '..', 'migrations', '351_session_revocation.sql'),
      'utf8'
    );
    const firstSelect = sql.search(/SELECT[\s\S]*?information_schema\.columns/i);
    const firstAlter = sql.search(/^\s*ALTER TABLE/im);
    expect(firstSelect).toBeGreaterThan(-1);
    expect(firstSelect).toBeLessThan(firstAlter);
  });
});
