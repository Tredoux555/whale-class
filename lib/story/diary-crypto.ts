// lib/story/diary-crypto.ts
//
// AES-256-GCM at-rest encryption for the personal platform (diary, projects,
// coach memory, day plans). Same wire format as lib/montree/messaging-crypto.ts
// (`gcm:<iv-hex>:<authTag-hex>:<ciphertext-hex>`) but keyed by a DEDICATED
// 32-byte hex env var, STORY_DIARY_KEY, so a Montree key rotation never touches
// the diary and vice-versa.
//
// PRIVACY MODEL (spec §3 — STORY_PERSONAL_PLATFORM_BUILD.md):
//   * Single tier. The Coach reads everything server-side by design.
//   * Encrypted at rest with a SERVER-HELD key. A raw DB leak is useless
//     without the key. Not hardened against a fully-compromised running server.
//   * FAIL CLOSED: if STORY_DIARY_KEY is missing/invalid, writes THROW (no
//     silent plaintext fall-through — unlike the Montree feature-flag pattern,
//     here encryption is non-negotiable).
//
// KEY: STORY_DIARY_KEY is 32 BYTES of hex (= 64 hex chars).
//   Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// Sentinel on decrypt failure mirrors messaging-crypto — visible failure beats
// rendering raw ciphertext or empty strings (and beats the covert-plaintext
// channel of a "no prefix → return verbatim" fallback).

import crypto from 'crypto';

const KEY_BYTES = 32; // AES-256

// Resolve a valid explicit STORY_DIARY_KEY (64 hex chars → 32 bytes) or null.
function explicitKey(): Buffer | null {
  const raw = process.env.STORY_DIARY_KEY;
  if (!raw) return null;
  try {
    const b = Buffer.from(raw.trim(), 'hex');
    return b.length === KEY_BYTES ? b : null;
  } catch {
    return null;
  }
}

// Fallback: derive a stable 32-byte key from the always-present STORY_JWT_SECRET
// (domain-separated so it's never the JWT secret itself). This means the brain
// "just works" without a second env var — encryption stays on (server-held key,
// at-rest protection) even if STORY_DIARY_KEY was never set or was malformed.
function derivedKey(): Buffer | null {
  const jwt = process.env.STORY_JWT_SECRET;
  if (!jwt) return null;
  return crypto.createHash('sha256').update('story-personal-platform-key:v1:' + jwt).digest();
}

let _keySourceLogged = false;
function getKey(): Buffer {
  const explicit = explicitKey();
  if (explicit) {
    if (!_keySourceLogged) { _keySourceLogged = true; console.log('[diary-crypto] using STORY_DIARY_KEY'); }
    return explicit;
  }
  const derived = derivedKey();
  if (derived) {
    if (!_keySourceLogged) {
      _keySourceLogged = true;
      console.log('[diary-crypto] STORY_DIARY_KEY not set/invalid — deriving key from STORY_JWT_SECRET');
    }
    return derived;
  }
  throw new Error('[diary-crypto] no key material: set STORY_DIARY_KEY (64 hex chars) or STORY_JWT_SECRET');
}

/**
 * Cheap presence check — does NOT throw. True when we have key material from
 * EITHER a valid STORY_DIARY_KEY or STORY_JWT_SECRET (the derive fallback).
 */
export function isDiaryEncryptionConfigured(): boolean {
  return explicitKey() !== null || !!process.env.STORY_JWT_SECRET;
}

/** Encrypt a plaintext string → `gcm:iv:tag:ct`. THROWS if key missing/invalid. */
export function encryptDiaryField(plaintext: string): string {
  const iv = crypto.randomBytes(12); // GCM standard IV length
  const key = getKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `gcm:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export const DIARY_DECRYPT_FAILURE_SENTINEL = '[Encrypted — could not decrypt]';

/** Decrypt `gcm:iv:tag:ct` → plaintext. Returns the sentinel on ANY failure. */
export function decryptDiaryField(ciphertext: string): string {
  try {
    if (!ciphertext || typeof ciphertext !== 'string') {
      return DIARY_DECRYPT_FAILURE_SENTINEL;
    }
    if (!ciphertext.startsWith('gcm:')) {
      console.warn('[diary-crypto] decrypt received non-prefixed value');
      return DIARY_DECRYPT_FAILURE_SENTINEL;
    }
    const parts = ciphertext.split(':');
    if (parts.length !== 4) return DIARY_DECRYPT_FAILURE_SENTINEL;
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const ct = parts[3];
    const key = getKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let plain = decipher.update(ct, 'hex', 'utf8');
    plain += decipher.final('utf8');
    return plain;
  } catch (error) {
    console.error('[diary-crypto] decrypt error:', error);
    return DIARY_DECRYPT_FAILURE_SENTINEL;
  }
}

/**
 * Read an at-rest field, branching on cipher_version.
 *   - version 1 → decrypt
 *   - version null/0 → pass through (defensive; the platform always writes v1)
 * Null/undefined input → ''.
 */
export function readDiaryField(
  value: string | null | undefined,
  version: number | null | undefined,
): string {
  if (value === null || value === undefined) return '';
  if (!version || version === 0) return value;
  if (version === 1) return decryptDiaryField(value);
  console.error('[diary-crypto] unknown cipher_version', version);
  return DIARY_DECRYPT_FAILURE_SENTINEL;
}

/**
 * Encrypt a nullable field for a write payload. Empty/whitespace/null → null
 * (so optional columns stay NULL instead of storing an encrypted empty string).
 */
export function encryptDiaryFieldOrNull(
  plaintext: string | null | undefined,
): string | null {
  if (plaintext === null || plaintext === undefined) return null;
  const trimmed = plaintext;
  if (trimmed.trim() === '') return null;
  return encryptDiaryField(trimmed);
}
