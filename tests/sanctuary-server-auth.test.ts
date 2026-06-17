// tests/sanctuary-server-auth.test.ts
//
// Step 4 — the e2e auth LOGIC that the /api/story/admin/auth (login) and
// /auth/claim routes wrap. Proves:
//   • an e2e login verifies against a Step-2-derived authSecret (KAT vectors),
//     and rejects a wrong / malformed one;
//   • claim-input validation (base64 + exact byte lengths);
//   • the e2e-claim detector + the missing-column (pre-migration) detector;
//   • selectAdminUserForAuth degrades to non-e2e BEFORE migration 265 (42703),
//     and reports e2e users AFTER it — so the legacy bcrypt login never breaks.

import { describe, it, expect, beforeAll } from 'vitest';
import vectors from '@/lib/sanctuary-e2e/vectors.json';
import { ready, b64, randomNonce } from '@/lib/sanctuary-e2e/crypto';
import {
  selectAdminUserForAuth,
  isE2eClaim,
  validateE2eClaimInput,
  verifyE2eLogin,
  isMissingColumnError,
} from '@/lib/sanctuary-e2e/server-auth';

const v = vectors as typeof vectors;

beforeAll(async () => {
  await ready();
});

describe('verifyE2eLogin (the login check)', () => {
  it('accepts a correct authSecret against the stored verifier', async () => {
    expect(await verifyE2eLogin(v.expected.authSecret_b64, v.expected.verifier_b64)).toBe(true);
  });
  it('rejects a wrong authSecret', async () => {
    expect(await verifyE2eLogin(b64(randomNonce()), v.expected.verifier_b64)).toBe(false);
  });
  it('rejects when no verifier is stored', async () => {
    expect(await verifyE2eLogin(v.expected.authSecret_b64, null)).toBe(false);
  });
  it('rejects malformed base64 authSecret', async () => {
    expect(await verifyE2eLogin('!!not base64!!', v.expected.verifier_b64)).toBe(false);
  });
});

describe('validateE2eClaimInput', () => {
  it('accepts a 16-byte salt + 32-byte verifier (base64)', () => {
    // salt_hex is 16 bytes; verifier_b64 is 32 bytes — re-encode salt to b64.
    const saltB64 = b64(Uint8Array.from(Buffer.from(v.input.salt_hex, 'hex')));
    expect(validateE2eClaimInput(saltB64, v.expected.verifier_b64)).toEqual({ ok: true });
  });
  it('rejects a wrong-length salt', () => {
    const bad = b64(randomNonce()); // 24 bytes, not 16
    const r = validateE2eClaimInput(bad, v.expected.verifier_b64);
    expect(r.ok).toBe(false);
  });
  it('rejects a wrong-length verifier', () => {
    const saltB64 = b64(Uint8Array.from(Buffer.from(v.input.salt_hex, 'hex')));
    const r = validateE2eClaimInput(saltB64, b64(randomNonce())); // 24 bytes, not 32
    expect(r.ok).toBe(false);
  });
  it('rejects non-base64 input', () => {
    expect(validateE2eClaimInput('!!!', '???').ok).toBe(false);
  });
});

describe('isE2eClaim', () => {
  it('is true for { username, kdf_salt, auth_verifier } with no password', () => {
    expect(isE2eClaim({ username: 'x', kdf_salt: 'a', auth_verifier: 'b' })).toBe(true);
  });
  it('is false when a password is present (legacy claim)', () => {
    expect(isE2eClaim({ username: 'x', kdf_salt: 'a', auth_verifier: 'b', password: 'p' })).toBe(false);
  });
  it('is false when e2e fields are missing', () => {
    expect(isE2eClaim({ username: 'x', password: 'p' })).toBe(false);
    expect(isE2eClaim({ username: 'x', kdf_salt: 'a' })).toBe(false);
    expect(isE2eClaim(null)).toBe(false);
  });
});

describe('isMissingColumnError', () => {
  it('detects Postgres 42703 (SELECT) and PostgREST PGRST204 (UPDATE)', () => {
    expect(isMissingColumnError({ code: '42703' })).toBe(true);
    expect(isMissingColumnError({ code: 'PGRST204' })).toBe(true);
  });
  it('is false for unrelated errors and non-objects', () => {
    expect(isMissingColumnError({ code: '23505' })).toBe(false);
    expect(isMissingColumnError(null)).toBe(false);
    expect(isMissingColumnError('boom')).toBe(false);
  });
});

// ── selectAdminUserForAuth with a minimal query-builder mock ────────────────
type Resp = { data: unknown[] | null; error: { code?: string } | null };
function mockSupabase(responder: (columns: string) => Resp) {
  return {
    from() {
      return {
        select(columns: string) {
          return {
            eq() {
              return this;
            },
            limit() {
              return Promise.resolve(responder(columns));
            },
          };
        },
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('selectAdminUserForAuth', () => {
  it('returns an e2e user when the e2e columns exist (post-migration)', async () => {
    const sb = mockSupabase((cols) =>
      cols.includes('e2e')
        ? {
            data: [
              {
                username: 'bayan',
                password_hash: 'E2E_NO_PASSWORD',
                space: 'bayan',
                e2e: true,
                kdf_salt: v.input.salt_hex,
                auth_verifier: v.expected.verifier_b64,
              },
            ],
            error: null,
          }
        : { data: null, error: { code: 'unexpected' } },
    );
    const u = await selectAdminUserForAuth(sb, 'bayan');
    expect(u).not.toBeNull();
    expect(u!.e2e).toBe(true);
    expect(u!.space).toBe('bayan');
    expect(u!.auth_verifier).toBe(v.expected.verifier_b64);
  });

  it('degrades to non-e2e on a 42703 wide-select (pre-migration) via the narrow fallback', async () => {
    const sb = mockSupabase((cols) =>
      cols.includes('e2e')
        ? { data: null, error: { code: '42703' } } // wide select fails: column absent
        : {
            data: [{ username: 'tredoux', password_hash: '$2a$10$hash', space: 'tredoux' }],
            error: null,
          },
    );
    const u = await selectAdminUserForAuth(sb, 'tredoux');
    expect(u).not.toBeNull();
    expect(u!.e2e).toBe(false);
    expect(u!.password_hash).toBe('$2a$10$hash');
    expect(u!.space).toBe('tredoux');
    expect(u!.kdf_salt).toBeNull();
  });

  it('returns null when the user does not exist', async () => {
    const sb = mockSupabase(() => ({ data: [], error: null }));
    expect(await selectAdminUserForAuth(sb, 'ghost')).toBeNull();
  });

  it('defaults space to "tredoux" when the column is empty', async () => {
    const sb = mockSupabase((cols) =>
      cols.includes('e2e')
        ? { data: [{ username: 'x', password_hash: 'h', space: '', e2e: false, kdf_salt: null, auth_verifier: null }], error: null }
        : { data: null, error: { code: 'unexpected' } },
    );
    const u = await selectAdminUserForAuth(sb, 'x');
    expect(u!.space).toBe('tredoux');
  });
});
