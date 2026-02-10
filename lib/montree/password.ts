// lib/montree/password.ts
// Shared password hashing utilities with bcrypt + legacy SHA-256 dual-verify.
//
// Phase 2 security upgrade: All new passwords/codes are hashed with bcrypt.
// On login, legacy SHA-256 hashes are detected and silently re-hashed to bcrypt.

import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

/**
 * Hash a password or code with bcrypt (10 rounds).
 * Use this for ALL new account creation and password resets.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password/code against a stored hash.
 *
 * Dual-verify strategy:
 *  1. If the stored hash looks like bcrypt ($2a$, $2b$, $2y$), use bcrypt.compare
 *  2. Otherwise, assume SHA-256 (64-char hex) and compare directly
 *
 * Returns true if the password matches.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Bcrypt hashes always start with $2
  if (storedHash.startsWith('$2')) {
    return bcrypt.compare(password, storedHash);
  }

  // Legacy SHA-256 hash (64-char hex string)
  const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
  return sha256Hash === storedHash;
}

/**
 * Check if a stored hash is a legacy SHA-256 hash that should be re-hashed.
 * Bcrypt hashes start with $2; SHA-256 hashes are 64-char hex strings.
 */
export function isLegacyHash(hash: string): boolean {
  return !hash.startsWith('$2');
}

/**
 * Compute a SHA-256 hash (for legacy code-based lookups only).
 * DO NOT use this for new password storage — use hashPassword() instead.
 *
 * This is kept only for backward-compatible DB lookups where the hash
 * is used as a query key (e.g., teacher code login, principal trial login).
 */
export function legacySha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
