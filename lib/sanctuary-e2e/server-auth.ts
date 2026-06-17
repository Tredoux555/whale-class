// lib/sanctuary-e2e/server-auth.ts
//
// Server-side e2e auth helpers for the native Sanctuary. Pure + testable; the
// /api/story/admin/auth (login) and /auth/claim routes are thin wrappers over
// these so the security-critical logic is unit-tested against the Step-2
// known-answer vectors.
//
// SECURITY MODEL (§3): the server NEVER receives the password or the content
// key. For an e2e user it stores ONLY { e2e, kdf_salt, auth_verifier }:
//   • kdf_salt      — base64(16 bytes). NOT secret. Returned to the client so a
//                     fresh device can re-derive the Argon2id master key.
//   • auth_verifier — base64(crypto_generichash(authSecret)). Login checks
//                     generichash(submittedAuthSecret) == auth_verifier,
//                     constant-time. authSecret itself is NEVER stored or logged.
//
// HONEST RESIDUAL (documented in the app): a server that captures authSecret at
// login can mount an offline dictionary attack on the password. Argon2id + the
// strong-password gate are the mitigations.

import type { UntypedClient } from '@/lib/supabase-client';
import {
  ready,
  verifyLoginAuthSecretB64,
  unb64,
  KEY_BYTES,
  SALT_BYTES,
} from './crypto';

// password_hash marker written for an e2e user. It is NOT a valid bcrypt hash,
// so the bcrypt path can never authenticate an e2e user even if the e2e branch
// were somehow skipped. (Defence in depth — the login route gates on `e2e`.)
export const E2E_NO_PASSWORD = 'E2E_NO_PASSWORD';

// Marker the OWNER sets when creating an account that has not been claimed yet.
export const UNCLAIMED_SENTINEL = 'SET_ON_FIRST_LOGIN';

export interface AdminAuthRow {
  username: string;
  password_hash: string;
  space: string;
  e2e: boolean;
  kdf_salt: string | null;
  auth_verifier: string | null;
}

/**
 * True when a Supabase/PostgREST error means "an e2e column does not exist yet"
 * (migration 265 not applied). SELECT of a missing column surfaces the Postgres
 * code 42703; an UPDATE/INSERT with a missing column in the payload surfaces the
 * PostgREST schema-cache code PGRST204. Treat both as "e2e not enabled yet".
 */
export function isMissingColumnError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return code === '42703' || code === 'PGRST204';
}

/**
 * Look up an admin user for authentication, tolerant of migration 265 not yet
 * being applied. Tries the WIDE select (with the e2e columns); on Postgres
 * 42703 (undefined_column) it falls back to the NARROW select and reports the
 * user as non-e2e. This keeps the existing bcrypt login working BEFORE the
 * migration, and enables the e2e path AFTER it — with no separate deploy.
 *
 * Returns null when the user does not exist OR on an unexpected DB error
 * (caller treats null as "no such user" → falls through to 401).
 */
export async function selectAdminUserForAuth(
  supabase: UntypedClient,
  username: string,
): Promise<AdminAuthRow | null> {
  const wide = await supabase
    .from('story_admin_users')
    .select('username, password_hash, space, e2e, kdf_salt, auth_verifier')
    .eq('username', username)
    .limit(1);

  if (!wide.error) {
    if (!wide.data || wide.data.length === 0) return null;
    const r = wide.data[0] as Record<string, unknown>;
    return normalizeRow(r, true);
  }

  // Migration 265 not run yet → e2e columns absent → degrade to non-e2e.
  if (isMissingColumnError(wide.error)) {
    const narrow = await supabase
      .from('story_admin_users')
      .select('username, password_hash, space')
      .eq('username', username)
      .limit(1);
    if (narrow.error || !narrow.data || narrow.data.length === 0) return null;
    return normalizeRow(narrow.data[0] as Record<string, unknown>, false);
  }

  console.error('[sanctuary-auth] user lookup error:', wide.error.code);
  return null;
}

function normalizeRow(r: Record<string, unknown>, hasE2eCols: boolean): AdminAuthRow {
  return {
    username: String(r.username),
    password_hash: String(r.password_hash ?? ''),
    space: (typeof r.space === 'string' && r.space) ? r.space : 'tredoux',
    e2e: hasE2eCols ? r.e2e === true : false,
    kdf_salt: hasE2eCols && typeof r.kdf_salt === 'string' ? r.kdf_salt : null,
    auth_verifier:
      hasE2eCols && typeof r.auth_verifier === 'string' ? r.auth_verifier : null,
  };
}

/** Does this request body describe an e2e CLAIM (vs. a legacy password claim)? */
export function isE2eClaim(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.kdf_salt === 'string' &&
    typeof b.auth_verifier === 'string' &&
    typeof b.password !== 'string'
  );
}

/**
 * Validate the base64 shapes for an e2e claim. Requires `await ready()` first
 * (uses libsodium base64 decode for an exact-byte-length check, ORIGINAL
 * variant — the locked transport encoding).
 */
export function validateE2eClaimInput(
  kdfSaltB64: string,
  authVerifierB64: string,
): { ok: true } | { ok: false; error: string } {
  let salt: Uint8Array;
  let verifier: Uint8Array;
  try {
    salt = unb64(kdfSaltB64);
    verifier = unb64(authVerifierB64);
  } catch {
    return { ok: false, error: 'kdf_salt and auth_verifier must be base64' };
  }
  if (salt.length !== SALT_BYTES) {
    return { ok: false, error: `kdf_salt must be ${SALT_BYTES} bytes` };
  }
  if (verifier.length !== KEY_BYTES) {
    return { ok: false, error: `auth_verifier must be ${KEY_BYTES} bytes` };
  }
  return { ok: true };
}

/**
 * Verify an e2e LOGIN: constant-time check that
 * crypto_generichash(submittedAuthSecret) == storedVerifier.
 * Returns false on any malformed input or mismatch. Awaits libsodium.
 */
export async function verifyE2eLogin(
  submittedAuthSecretB64: string,
  storedVerifierB64: string | null,
): Promise<boolean> {
  if (!storedVerifierB64) return false;
  await ready();
  return verifyLoginAuthSecretB64(submittedAuthSecretB64, storedVerifierB64);
}
