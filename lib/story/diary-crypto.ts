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

function getKey(): Buffer {
  const raw = process.env.STORY_DIARY_KEY;
  if (!raw) {
    throw new Error(
      '[diary-crypto] STORY_DIARY_KEY env var must be set (32-byte hex = 64 chars)',
    );
  }
  const key = Buffer.from(raw.trim(), 'hex');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `[diary-crypto] STORY_DIARY_KEY must decode to ${KEY_BYTES} bytes ` +
        `(got ${key.length}). Use 64 hex chars.`,
    );
  }
  return key;
}

/**
 * Cheap presence/length check — does NOT throw. Use as a guard in write paths
 * so a misconfigured key produces a clean 500 with a clear message rather than
 * a half-written row.
 */
export function isDiaryEncryptionConfigured(): boolean {
  const raw = process.env.STORY_DIARY_KEY;
  if (!raw) return false;
  try {
    return Buffer.from(raw.trim(), 'hex').length === KEY_BYTES;
  } catch {
    return false;
  }
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
