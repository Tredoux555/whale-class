// lib/verify-super-admin.ts
// Phase 9: Shared timing-safe super-admin password verification
// Phase 10: JWT session token support (no password in sessionStorage)
// Prevents timing attacks by using constant-time comparison

import { timingSafeEqual } from 'crypto';
import { jwtVerify } from 'jose';

/** Issuer/audience pinned on super-admin tokens. A token minted for any other
 *  Montree surface (app, CMS, community) can never satisfy this verifier. */
export const SUPER_ADMIN_ISSUER = 'montree';
export const SUPER_ADMIN_AUDIENCE = 'super-admin';

/**
 * Minimum acceptable length for the super-admin signing key. 32 characters of
 * random text is ~128 bits if generated properly; anything shorter is
 * brute-forceable offline against a single captured token.
 */
const MIN_SECRET_LENGTH = 32;

/**
 * Signing key for super-admin session JWTs.
 *
 * 🚨 REQUIRES a dedicated SUPER_ADMIN_JWT_SECRET. No fallbacks. This is
 * deliberate and it FAILS CLOSED — if the variable is missing, super-admin
 * login stops working until it is set.
 *
 * ── Why the fallback had to go ───────────────────────────────────────────────
 * The previous chain was
 *
 *     SUPER_ADMIN_JWT_SECRET || SUPER_ADMIN_PASSWORD || ADMIN_SECRET
 *
 * so in practice tokens were signed with SUPER_ADMIN_PASSWORD — a human-typed
 * password. HMAC keys must be high-entropy, because an attacker who obtains ONE
 * super-admin token (from a log line, a browser extension, a shared screenshot,
 * a proxy) can brute-force the signing key OFFLINE at billions of guesses per
 * second, with no rate limit and nothing to alert on. A memorable password does
 * not survive that. Recovering it yields two things at once: the ability to
 * FORGE super-admin tokens for the whole platform, and the login password
 * itself.
 *
 * ADMIN_SECRET was no better as a last resort — it is the same key that signs
 * ordinary Montree teacher sessions (lib/montree/server-auth.ts falls back to
 * it), so a leak in either system would have compromised the other.
 *
 * Keeping "just a fallback so nothing breaks" meant the insecure path was the
 * one actually in use, and staying quiet about it. Failing closed is louder and
 * is fixed by setting one Railway variable — see docs/handoffs/.
 */
export function getSuperAdminTokenSecret(): Uint8Array {
  const secret = process.env.SUPER_ADMIN_JWT_SECRET;

  if (!secret) {
    console.error(
      '[verifySuperAdminAuth] FATAL: SUPER_ADMIN_JWT_SECRET is not set. ' +
        'Super-admin login and token verification are disabled until it is. ' +
        'Set it in Railway to a long random value, e.g. `openssl rand -base64 48`. ' +
        'It must NOT be the same value as SUPER_ADMIN_PASSWORD or ADMIN_SECRET.'
    );
    throw new Error('SUPER_ADMIN_JWT_SECRET is required');
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    console.error(
      `[verifySuperAdminAuth] FATAL: SUPER_ADMIN_JWT_SECRET is only ${secret.length} characters. ` +
        `At least ${MIN_SECRET_LENGTH} are required — a short signing key can be brute-forced ` +
        'offline from a single captured token. Regenerate with `openssl rand -base64 48`.'
    );
    throw new Error('SUPER_ADMIN_JWT_SECRET is too short');
  }

  // A signing key that IS the login password re-creates the original flaw with
  // extra steps, so refuse it explicitly rather than trusting the operator to
  // have picked something different.
  if (
    secret === process.env.SUPER_ADMIN_PASSWORD ||
    secret === process.env.ADMIN_SECRET
  ) {
    console.error(
      '[verifySuperAdminAuth] FATAL: SUPER_ADMIN_JWT_SECRET must be a DISTINCT value — ' +
        'it currently matches SUPER_ADMIN_PASSWORD or ADMIN_SECRET. Reusing the login ' +
        'password (or the teacher-session key) as the token signing key is the exact ' +
        'weakness this check exists to prevent. Generate a separate value.'
    );
    throw new Error('SUPER_ADMIN_JWT_SECRET must not reuse another secret');
  }

  return new TextEncoder().encode(secret);
}

/**
 * Verify a super-admin password using timing-safe comparison.
 * Uses fixed-size buffers to prevent timing-based password enumeration.
 *
 * @param provided - The password provided by the caller
 * @param envVar - Which env var to check against (default: SUPER_ADMIN_PASSWORD)
 * @returns { valid: boolean, error?: string } - valid=true if password matches
 */
export function verifySuperAdminPassword(
  provided: string | null | undefined,
  envVar: 'SUPER_ADMIN_PASSWORD' | 'ADMIN_PASSWORD' = 'SUPER_ADMIN_PASSWORD'
): { valid: boolean; error?: string } {
  if (!provided) {
    return { valid: false, error: 'Password required' };
  }

  const expected = process.env[envVar];
  if (!expected) {
    console.error(`[verifySuperAdminPassword] ${envVar} not configured`);
    return { valid: false, error: 'Server misconfiguration' };
  }

  try {
    // Fixed 256-byte buffers prevent length-based timing leaks
    const aBuf = Buffer.alloc(256, 0);
    const bBuf = Buffer.alloc(256, 0);
    aBuf.write(provided, 'utf8');
    bBuf.write(expected, 'utf8');
    const match = timingSafeEqual(aBuf, bBuf);
    return { valid: match };
  } catch {
    return { valid: false };
  }
}

/**
 * Verify a super-admin JWT session token OR fall back to password check.
 * Accepts token via x-super-admin-token header, password via x-super-admin-password header.
 * Returns { valid: true } if either passes.
 */
export async function verifySuperAdminAuth(
  headers: Headers
): Promise<{ valid: boolean; error?: string }> {
  // Try JWT token first (preferred — no password in transit after login)
  const token = headers.get('x-super-admin-token');
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSuperAdminTokenSecret(), {
        issuer: SUPER_ADMIN_ISSUER,
        audience: SUPER_ADMIN_AUDIENCE,
      });
      if (payload.role === 'super_admin') {
        return { valid: true };
      }
    } catch {
      // Token expired or invalid — fall through to password check
    }
  }

  // Fall back to password (backward compat for audit route, etc.)
  const password = headers.get('x-super-admin-password');
  return verifySuperAdminPassword(password);
}
