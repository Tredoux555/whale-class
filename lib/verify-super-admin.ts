// lib/verify-super-admin.ts
// Phase 9: Shared timing-safe super-admin password verification
// Phase 10: JWT session token support (no password in sessionStorage)
// Prevents timing attacks by using constant-time comparison

import { timingSafeEqual } from 'crypto';
import { jwtVerify } from 'jose';

/**
 * Signing key for super-admin session JWTs.
 *
 * audit-fix (Jun 2026): tokens used to be signed with SUPER_ADMIN_PASSWORD
 * itself — a short password doubling as the signing key means anyone can
 * forge admin tokens by guessing the password offline. Prefer a dedicated
 * long random SUPER_ADMIN_JWT_SECRET (set it in Railway); the old chain is
 * kept as fallback so nothing breaks before the env var is added.
 */
export function getSuperAdminTokenSecret(): Uint8Array {
  const secret =
    process.env.SUPER_ADMIN_JWT_SECRET ||
    process.env.SUPER_ADMIN_PASSWORD ||
    process.env.ADMIN_SECRET;
  if (!secret) throw new Error('SUPER_ADMIN_JWT_SECRET, SUPER_ADMIN_PASSWORD or ADMIN_SECRET required');
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
      const { payload } = await jwtVerify(token, getSuperAdminTokenSecret());
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
