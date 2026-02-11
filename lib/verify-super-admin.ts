// lib/verify-super-admin.ts
// Phase 9: Shared timing-safe super-admin password verification
// Prevents timing attacks by using constant-time comparison

import { timingSafeEqual } from 'crypto';

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
