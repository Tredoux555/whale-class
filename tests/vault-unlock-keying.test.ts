// tests/vault-unlock-keying.test.ts
// app/api/story/admin/vault/unlock/route.ts — the M2 limiter wiring. Pins
// down the security-critical contract of how the route calls the shared rate
// limiter, WITHOUT exercising the real limiter / bcrypt / jose:
//   • key = `${authenticatedAdmin}|${ip}` — derived from the verified admin
//     identity + the app-standard getClientIP (LAST x-forwarded-for hop — the
//     entry our trusted edge appended, which a client cannot forge), NOT the
//     raw attacker-rotatable header blob and NOT the client-supplied first hop.
//     See the trust-order block in lib/montree/audit-logger.ts. This assertion
//     was corrected Aug 18 2026: it had pinned the pre-hardening first-hop
//     contract, which would let an attacker rotate limiter buckets at will.
//   • failMode 'closed' — a limiter backend error denies (429), not allows.
//   • a 429 from the limiter short-circuits BEFORE any bcrypt password check.
//
// checkRateLimit, story-db (getSupabase/verifyAdminToken/getJWTSecret) and
// bcryptjs are all mocked — no network, no real hashing, deterministic.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module-level env read at import time in the route.
process.env.VAULT_PASSWORD_HASH = '$2a$10$testhashshapeonlynotreal000000000000000000000000';

const compareMock = vi.fn();
vi.mock('bcryptjs', () => ({
  default: { compare: (...a: unknown[]) => compareMock(...a) },
  compare: (...a: unknown[]) => compareMock(...a),
}));

vi.mock('@/lib/rate-limiter', () => ({ checkRateLimit: vi.fn() }));
vi.mock('@/lib/story-db', () => ({
  getSupabase: vi.fn(() => ({ from: () => ({ insert: () => Promise.resolve({ error: null }) }) })),
  verifyAdminToken: vi.fn(),
  getJWTSecret: vi.fn(() => new TextEncoder().encode('test-only-vault-secret-1234567890')),
  // Added Jun 15 2026 (commit 467f64b35): the route now also imports the hard
  // vault-owner gate. Real signature is async (authHeader) => Promise<boolean>.
  isVaultOwner: vi.fn(async () => true),
}));

import { checkRateLimit } from '@/lib/rate-limiter';
import { verifyAdminToken } from '@/lib/story-db';
import { POST } from '@/app/api/story/admin/vault/unlock/route';
import type { NextRequest } from 'next/server';

const ADMIN = 'admin-jane';

function req(opts: { xff?: string; password?: unknown } = {}): NextRequest {
  const headers = new Headers();
  if (opts.xff !== undefined) headers.set('x-forwarded-for', opts.xff);
  headers.set('authorization', 'Bearer fake-admin-jwt');
  return {
    headers,
    json: async () => ({ password: opts.password ?? 'super-secret-pw' }),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(verifyAdminToken).mockResolvedValue(ADMIN);
});

describe('vault unlock — limiter keying (M2)', () => {
  it('calls checkRateLimit keyed on authenticated admin + last XFF hop (trusted-edge-appended, anti-spoof), failMode closed', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfterSeconds: 900 });
    // Multiple XFF hops — getClientIP must take the LAST (appended by our own
    // edge), not the raw blob and not the client-controlled leading entries.
    await POST(req({ xff: '198.51.100.9, 10.0.0.1, 70.0.0.1' }));

    expect(checkRateLimit).toHaveBeenCalledTimes(1);
    const [, key, endpoint, max, win, failMode] = vi.mocked(checkRateLimit).mock.calls[0];
    expect(key).toBe(`${ADMIN}|70.0.0.1`);
    expect(key).not.toContain('198.51.100.9'); // spoofable client-supplied hop excluded
    expect(key).not.toContain('10.0.0.1');     // intermediate hops excluded
    expect(key).not.toContain(', ');           // not the raw header blob
    expect(endpoint).toBe('/api/story/admin/vault/unlock');
    expect(max).toBe(5);
    expect(win).toBe(15);
    expect(failMode).toBe('closed');
  });

  it('a denied (429) limiter result short-circuits BEFORE any password/bcrypt check', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfterSeconds: 900 });
    const res = await POST(req({ xff: '198.51.100.9' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('900');
    expect(compareMock).not.toHaveBeenCalled(); // limiter gates the bcrypt oracle
  });

  it('falls back to "unknown" IP when no forwarding headers are present (still admin-keyed)', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, retryAfterSeconds: 900 });
    await POST(req({}));
    const [, key] = vi.mocked(checkRateLimit).mock.calls[0];
    expect(key).toBe(`${ADMIN}|unknown`);
  });

  it('unauthenticated requests are rejected (401) before the limiter is consulted', async () => {
    vi.mocked(verifyAdminToken).mockResolvedValue(null);
    const res = await POST(req({ xff: '198.51.100.9' }));
    expect(res.status).toBe(401);
    expect(checkRateLimit).not.toHaveBeenCalled();
  });
});
