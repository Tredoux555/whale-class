// lib/sanctuary-e2e/crypto.ts
//
// Sanctuary native E2E — TypeScript REFERENCE implementation of the §3 crypto
// spec (docs/SANCTUARY_NATIVE_BUILD_RUNBOOK.md). This is the contract the Swift
// `swift-sodium` implementation must match byte-for-byte (proven by the XCTest
// in Step 7, which loads the same vectors.json this module generates).
//
// ──────────────────────────────────────────────────────────────────────────
// WHO RUNS WHAT (privacy invariant — see README.md):
//   • deriveMaster / deriveContentKey / deriveAuthSecret / encrypt / decrypt
//       → CLIENT ONLY (Swift app) + this TS reference (tests/vectors).
//   • authVerifier  → CLIENT (at claim) + SERVER (at login, to check the
//       verifier). The server NEVER runs Argon2 and NEVER decrypts content.
// ──────────────────────────────────────────────────────────────────────────
//
// KEY HIERARCHY (libsodium):
//   master      = crypto_pwhash(P, S, ALG=ARGON2ID13, OPS=3, MEM=128 MiB) → 32B
//   contentKey  = crypto_kdf_derive_from_key(id=1, ctx="sanctctn", master) → 32B
//   authSecret  = crypto_kdf_derive_from_key(id=2, ctx="sanctaut", master) → 32B
//   verifier    = crypto_generichash(32, authSecret)                       → 32B
//
// CONTENT WIRE FORMAT (every journal/coach/project record):
//   nonce = 24 random bytes
//   ct    = crypto_secretbox_easy(plaintext, nonce, contentKey)   (tag||cipher)
//   wire  = "sb1." + base64(nonce) + "." + base64(ct)
//   base64 variant = ORIGINAL (standard, padded). The "." separator is never a
//   base64 char, so split('.') is unambiguous.
//
// TRANSPORT ENCODING (server boundary): kdf_salt, auth_verifier and the
// login-time authSecret all travel as base64(ORIGINAL) strings.

import _sodium from 'libsodium-wrappers-sumo';

// ── §3 locked constants ────────────────────────────────────────────────────
export const CONTENT_KEY_CTX = 'sanctctn'; // EXACTLY 8 bytes (libsodium ctx)
export const AUTH_SECRET_CTX = 'sanctaut'; // EXACTLY 8 bytes
export const CONTENT_KEY_SUBKEY_ID = 1;
export const AUTH_SECRET_SUBKEY_ID = 2;

export const ARGON2_OPSLIMIT = 3;
export const ARGON2_MEMLIMIT = 128 * 1024 * 1024; // 134217728 BYTES (NOT KiB)

export const KEY_BYTES = 32;
export const SALT_BYTES = 16;
export const NONCE_BYTES = 24;

export const WIRE_PREFIX = 'sb1';
export const DECRYPT_FAILURE_SENTINEL = '[Encrypted — could not decrypt]';

// Compile-time-ish guard: the kdf context MUST be exactly 8 bytes or libsodium
// throws at call time. Assert loudly at import so a bad edit fails immediately.
if (
  new TextEncoder().encode(CONTENT_KEY_CTX).length !== 8 ||
  new TextEncoder().encode(AUTH_SECRET_CTX).length !== 8
) {
  throw new Error('[sanctuary-crypto] kdf context strings must be exactly 8 bytes');
}

let _ready = false;
/** Await before calling any other function. Cheap after first init. */
export async function ready(): Promise<void> {
  if (_ready) return;
  await _sodium.ready;
  _ready = true;
}

function requireReady(): void {
  if (!_ready) {
    throw new Error('[sanctuary-crypto] call await ready() before using the crypto core');
  }
}

// ── encoding helpers (ORIGINAL base64 — the locked wire/transport variant) ──
export function b64(bytes: Uint8Array): string {
  return _sodium.to_base64(bytes, _sodium.base64_variants.ORIGINAL);
}
export function unb64(s: string): Uint8Array {
  return _sodium.from_base64(s, _sodium.base64_variants.ORIGINAL);
}
export function hex(bytes: Uint8Array): string {
  return _sodium.to_hex(bytes);
}
export function unhex(s: string): Uint8Array {
  return _sodium.from_hex(s);
}

// ── randomness ──────────────────────────────────────────────────────────────
export function randomSalt(): Uint8Array {
  requireReady();
  return _sodium.randombytes_buf(SALT_BYTES);
}
export function randomNonce(): Uint8Array {
  requireReady();
  return _sodium.randombytes_buf(NONCE_BYTES);
}

// ── key hierarchy ───────────────────────────────────────────────────────────
/** Argon2id master key. CLIENT-ONLY in production. */
export function deriveMaster(password: string, salt: Uint8Array): Uint8Array {
  requireReady();
  if (salt.length !== SALT_BYTES) {
    throw new Error(`[sanctuary-crypto] salt must be ${SALT_BYTES} bytes`);
  }
  return _sodium.crypto_pwhash(
    KEY_BYTES,
    password,
    salt,
    ARGON2_OPSLIMIT,
    ARGON2_MEMLIMIT,
    _sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
}

export function deriveContentKey(master: Uint8Array): Uint8Array {
  requireReady();
  return _sodium.crypto_kdf_derive_from_key(
    KEY_BYTES,
    CONTENT_KEY_SUBKEY_ID,
    CONTENT_KEY_CTX,
    master,
  );
}

export function deriveAuthSecret(master: Uint8Array): Uint8Array {
  requireReady();
  return _sodium.crypto_kdf_derive_from_key(
    KEY_BYTES,
    AUTH_SECRET_SUBKEY_ID,
    AUTH_SECRET_CTX,
    master,
  );
}

/** BLAKE2b-256 of authSecret — what the server stores + compares. */
export function authVerifier(authSecret: Uint8Array): Uint8Array {
  requireReady();
  return _sodium.crypto_generichash(KEY_BYTES, authSecret);
}

// ── content encryption ──────────────────────────────────────────────────────
/** Deterministic encrypt with a caller-supplied nonce (vectors/tests). */
export function encryptWithNonce(
  plaintext: string,
  contentKey: Uint8Array,
  nonce: Uint8Array,
): string {
  requireReady();
  if (nonce.length !== NONCE_BYTES) {
    throw new Error(`[sanctuary-crypto] nonce must be ${NONCE_BYTES} bytes`);
  }
  const ct = _sodium.crypto_secretbox_easy(plaintext, nonce, contentKey);
  return `${WIRE_PREFIX}.${b64(nonce)}.${b64(ct)}`;
}

/** Encrypt with a fresh random nonce. */
export function encrypt(plaintext: string, contentKey: Uint8Array): string {
  return encryptWithNonce(plaintext, contentKey, randomNonce());
}

export function parseWire(
  wire: string,
): { nonce: Uint8Array; ct: Uint8Array } | null {
  if (typeof wire !== 'string') return null;
  const parts = wire.split('.');
  if (parts.length !== 3 || parts[0] !== WIRE_PREFIX) return null;
  try {
    const nonce = unb64(parts[1]);
    const ct = unb64(parts[2]);
    if (nonce.length !== NONCE_BYTES) return null;
    return { nonce, ct };
  } catch {
    return null;
  }
}

/** Decrypt a wire string. FAILS CLOSED to the sentinel on ANY error. */
export function decrypt(wire: string, contentKey: Uint8Array): string {
  requireReady();
  const parsed = parseWire(wire);
  if (!parsed) return DECRYPT_FAILURE_SENTINEL;
  try {
    const pt = _sodium.crypto_secretbox_open_easy(
      parsed.ct,
      parsed.nonce,
      contentKey,
    );
    return _sodium.to_string(pt);
  } catch {
    return DECRYPT_FAILURE_SENTINEL;
  }
}

// ── auth verification (server side) ─────────────────────────────────────────
/** Constant-time check that generichash(authSecret) == verifier. */
export function verifyAuthSecretAgainstVerifier(
  authSecret: Uint8Array,
  verifier: Uint8Array,
): boolean {
  requireReady();
  if (verifier.length !== KEY_BYTES) return false;
  const computed = authVerifier(authSecret);
  return _sodium.memcmp(computed, verifier);
}

/** Convenience for the login route: both args base64(ORIGINAL). */
export function verifyLoginAuthSecretB64(
  authSecretB64: string,
  verifierB64: string,
): boolean {
  requireReady();
  let authSecret: Uint8Array;
  let verifier: Uint8Array;
  try {
    authSecret = unb64(authSecretB64);
    verifier = unb64(verifierB64);
  } catch {
    return false;
  }
  if (authSecret.length !== KEY_BYTES) return false;
  return verifyAuthSecretAgainstVerifier(authSecret, verifier);
}
