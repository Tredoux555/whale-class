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
 * Signing key for super-admin session JWTs.
 *
 * audit-fix (Sep 2026, finding 10/13): tokens used to fall back to
 * SUPER_ADMIN_PASSWORD or ADMIN_SECRET. A short human-typed password doubling
 * as the signing key is offline-guessable from any captured token, and sharing
 * ADMIN_SECRET made five token families interchangeable. SUPER_ADMIN_JWT_SECRET
 * is now set in Railway and is REQUIRED — a missing var fails loudly at first
 * use rather than silently degrading to a weaker key.
 */
export function getSuperAdminTokenSecret(): Uint8Array {
  const secret = process.env.SUPER_ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error(
      'SUPER_ADMIN_JWT_SECRET is required (32+ random bytes). Set it in the environment; the SUPER_ADMIN_PASSWORD / ADMIN_SECRET fallbacks were removed as a security fix.'
    );
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
