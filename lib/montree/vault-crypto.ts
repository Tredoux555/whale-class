// lib/montree/vault-crypto.ts
//
// Client-side end-to-end encryption for the principal's parent-meeting vault.
// Uses WebCrypto (browser-native) so the password and derived key never leave
// the browser. The server stores only the ciphertext + per-record salt + iv.
//
// Scheme:
//   key = PBKDF2(password, salt, 600_000, sha256, 32 bytes)
//   ciphertext = AES-256-GCM(key, iv, plaintext)  (12-byte IV, 128-bit tag)
//   plaintext = utf-8(JSON.stringify({ summary, transcript, child_name?, ... }))
//
// AES-GCM auth-tag failure on decrypt = wrong password. We use that as the
// authoritative password-verification signal — no separate "password check"
// blob is stored.
//
// IMPORTANT: WebCrypto's importKey/PBKDF2 600k iterations is slow on weak
// devices (~300-700ms on a recent laptop, 1-2s on an older phone). Show a
// spinner during encryption / decryption.

const PBKDF2_ITERATIONS = 600_000;
const KEY_BIT_LENGTH = 256;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export interface PlaintextRecord {
  /** Three-paragraph Sonnet summary of the meeting. */
  summary: string;
  /** Raw Whisper transcript. May be empty for typed-only entries. */
  transcript: string;
  /** Child this meeting was about, if tagged. */
  child_id?: string | null;
  /** Child's display name at the time of saving (denormalised — surviving renames). */
  child_name?: string | null;
  /** ISO date the meeting actually happened (defaults to record creation). */
  meeting_date?: string;
  /** Free-text memo the principal added before saving. */
  notes?: string;
}

export interface EncryptedRecord {
  salt_b64: string;
  iv_b64: string;
  ciphertext_b64: string;
  pbkdf2_iterations: number;
  cipher_version: number;
}

// ── helpers ──────────────────────────────────────────────────────────────

function bytesToB64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_BIT_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// ── public API ───────────────────────────────────────────────────────────

/** Encrypt a plaintext record with the principal's vault password.
 *  Returns base64-encoded crypto fields ready to POST to /save. */
export async function encryptRecord(
  password: string,
  record: PlaintextRecord
): Promise<EncryptedRecord> {
  if (!password) throw new Error('Vault password is empty.');

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);

  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(record));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext as BufferSource
  );

  return {
    salt_b64: bytesToB64(salt),
    iv_b64: bytesToB64(iv),
    ciphertext_b64: bytesToB64(new Uint8Array(ciphertext)),
    pbkdf2_iterations: PBKDF2_ITERATIONS,
    cipher_version: 1,
  };
}

/** Decrypt a previously-saved record. Throws on wrong password
 *  (the AES-GCM auth tag will reject) or on tampered/corrupted ciphertext. */
export async function decryptRecord(
  password: string,
  encrypted: EncryptedRecord
): Promise<PlaintextRecord> {
  if (!password) throw new Error('Vault password is empty.');

  if (encrypted.cipher_version !== 1) {
    throw new Error(
      `Unsupported cipher version ${encrypted.cipher_version} (this app understands v1).`
    );
  }

  const salt = b64ToBytes(encrypted.salt_b64);
  const iv = b64ToBytes(encrypted.iv_b64);
  const ciphertext = b64ToBytes(encrypted.ciphertext_b64);

  const key = await deriveKey(password, salt, encrypted.pbkdf2_iterations);

  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );
  } catch {
    // GCM auth-tag failure. Either the password is wrong or the blob was
    // tampered with. From the principal's perspective, "wrong password" is
    // the relevant signal.
    throw new Error('WRONG_PASSWORD');
  }

  const dec = new TextDecoder();
  const json = dec.decode(plain);
  try {
    const obj = JSON.parse(json) as PlaintextRecord;
    return obj;
  } catch {
    throw new Error('Decrypted blob is not valid JSON.');
  }
}

/** Used at session-unlock time: try to decrypt the most recent record so
 *  the principal can confirm her password is correct before we store it
 *  in memory and start using it for further encryption. */
export async function verifyPasswordAgainstRecord(
  password: string,
  encrypted: EncryptedRecord
): Promise<boolean> {
  try {
    await decryptRecord(password, encrypted);
    return true;
  } catch (e) {
    if (e instanceof Error && e.message === 'WRONG_PASSWORD') return false;
    throw e;
  }
}
