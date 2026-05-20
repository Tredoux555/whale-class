// lib/montree/messaging-crypto.ts
//
// 🚨 Session 121 — application-layer encryption for messages, meeting
// notes, and call transcripts. Mirrors the Story system's pattern in
// `lib/message-encryption.ts` exactly:
//   - AES-256-GCM (authenticated encryption, defeats tampering)
//   - 32-character utf8 key from MONTREE_ENCRYPTION_KEY env var
//   - Ciphertext format: gcm:<iv-hex>:<authTag-hex>:<ciphertext-hex>
//   - Sentinel returned on decrypt failure rather than leaking gibberish
//
// ──────────────────────────────────────────────────────────────────
// VERSIONING (encryption_version column on each encrypted table)
//   - NULL → legacy plaintext (pre-encryption, served as-is)
//   - 1    → AES-256-GCM with current MONTREE_ENCRYPTION_KEY
// Future algorithm changes bump to 2 and use a different prefix.
//
// ROLLBACK CONTRACT
// Every encrypted table has both the encrypted column AND the
// `encryption_version` flag. Reads branch on version. Writes branch on
// the `encryption_v1` feature flag. If we ever roll back:
//   1. Flip feature flag OFF — new writes go to plaintext, version NULL.
//   2. Run scripts/decrypt-existing-rows.mjs — backfills plaintext.
// No data loss, no downtime. The decrypt path stays in the code
// indefinitely so old encrypted rows continue to decrypt cleanly.
//
// KEY ROTATION
// Rotating MONTREE_ENCRYPTION_KEY requires re-encrypting every
// version-1 row. See docs/handoffs/MONTREE_ENCRYPTION_RUNBOOK.md.
// Don't rotate without the runbook.
// ──────────────────────────────────────────────────────────────────

import crypto from 'crypto';

function getKey(): Buffer {
  const key = process.env.MONTREE_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      '[montree-crypto] MONTREE_ENCRYPTION_KEY env var must be set (exactly 32 characters utf8)',
    );
  }
  if (key.length !== 32) {
    throw new Error(
      `[montree-crypto] MONTREE_ENCRYPTION_KEY must be exactly 32 characters (got ${key.length})`,
    );
  }
  return Buffer.from(key, 'utf8');
}

/**
 * Check whether encryption is configured. Cheap — does NOT read the env
 * var, just checks presence + length. Use as a guard in write paths
 * before calling encryptField, so we never half-encrypt when misconfigured.
 */
export function isEncryptionConfigured(): boolean {
  const key = process.env.MONTREE_ENCRYPTION_KEY;
  return !!key && key.length === 32;
}

/**
 * Encrypt a plaintext string. Returns `gcm:iv:tag:ciphertext`.
 *
 * THROWS if MONTREE_ENCRYPTION_KEY is missing or wrong length. Callers
 * MUST gate on isEncryptionConfigured() OR the `encryption_v1` feature
 * flag before invoking — otherwise a misconfigured env var produces a
 * 500 instead of a fall-through to plaintext.
 */
export function encryptField(plaintext: string): string {
  try {
    const iv = crypto.randomBytes(12); // GCM standard IV length
    const key = getKey();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `gcm:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('[montree-crypto] encryptField error:', error);
    throw new Error('Failed to encrypt field');
  }
}

// 🚨 Sentinel returned on decrypt failure. Mirrors the Story system
// (lib/message-encryption.ts DECRYPT_FAILURE_SENTINEL) — visible failure
// mode is better than rendering raw ciphertext or empty strings.
// Frontend renders this as-is.
export const DECRYPT_FAILURE_SENTINEL = '[Encrypted — could not decrypt]';

/**
 * Decrypt a `gcm:iv:tag:ciphertext` string back to plaintext.
 *
 * Returns DECRYPT_FAILURE_SENTINEL on ANY failure:
 *   - Empty / non-string input
 *   - Missing format prefix (gcm:)
 *   - Wrong number of parts
 *   - Wrong key (auth tag mismatch — tampering OR key rotation issue)
 *   - Malformed hex
 *
 * Never throws — the failure mode is data integrity loss, not a 500.
 * The caller can show the sentinel to the user, scan for it in logs,
 * and take action (rotate back, restore from backup, etc).
 */
export function decryptField(ciphertext: string): string {
  try {
    if (!ciphertext || typeof ciphertext !== 'string') {
      return DECRYPT_FAILURE_SENTINEL;
    }
    if (!ciphertext.startsWith('gcm:')) {
      // No recognised format → treat as failure, NOT plaintext pass-through.
      // (The Session 113 V2 Story audit F-3.4 lesson — covert plaintext
      // channel via "no colon → return verbatim" was a real bug.)
      console.warn('[montree-crypto] decryptField received non-prefixed value');
      return DECRYPT_FAILURE_SENTINEL;
    }
    const parts = ciphertext.split(':');
    // parts[0]='gcm', parts[1]=iv, parts[2]=authTag, parts[3]=ciphertext
    if (parts.length !== 4) return DECRYPT_FAILURE_SENTINEL;
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
    console.error('[montree-crypto] decryptField error:', error);
    return DECRYPT_FAILURE_SENTINEL;
  }
}

/**
 * Decrypt a row's field, branching on the row's encryption_version.
 *   - version=1 → run decryptField on the ciphertext
 *   - version null/undefined → return value as-is (legacy plaintext)
 *
 * This is the canonical read pattern. Use everywhere that reads an
 * encryptable column. NEVER call decryptField directly without checking
 * the version — legacy plaintext rows would decrypt to a sentinel.
 *
 * @param value         The raw column value (may be plaintext or ciphertext).
 * @param version       The encryption_version column value (NULL or 1).
 * @returns             Plaintext, ready to send to client.
 */
export function readEncryptedField(
  value: string | null | undefined,
  version: number | null | undefined,
): string {
  if (value === null || value === undefined) return '';
  if (!version || version === 0) {
    // Legacy plaintext row — pass through. Don't try to decrypt; it'd
    // fail and return the sentinel even though the data is fine.
    return value;
  }
  if (version === 1) {
    return decryptField(value);
  }
  // Unknown version — should never happen. Log loudly and return sentinel
  // so the operator notices.
  console.error('[montree-crypto] unknown encryption_version', version);
  return DECRYPT_FAILURE_SENTINEL;
}

/**
 * Map a multi-field row through `readEncryptedField` in one call.
 * Convenience for the common case of decrypting 3+ columns on the same row.
 *
 * @example
 *   const { summary, transcript, notes } = readEncryptedFields(
 *     row,
 *     ['summary', 'transcript', 'notes'],
 *     row.encryption_version,
 *   );
 */
export function readEncryptedFields<T extends Record<string, unknown>>(
  row: T,
  fields: readonly (keyof T & string)[],
  version: number | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of fields) {
    const v = row[field];
    out[field] = readEncryptedField(
      typeof v === 'string' || v === null || v === undefined ? (v as string | null | undefined) : null,
      version,
    );
  }
  return out;
}

/**
 * Resolve the encryption_v1 feature-flag state, optionally per-school.
 * Handles the agent_super_admin case where schoolId is NULL (no school
 * scope — falls through to the global default).
 *
 * SAFE TO CALL ON EVERY WRITE PATH. Cost: 1-2 lightweight Supabase reads.
 * Routes that write many messages in a loop should hoist this call out
 * of the loop.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function isEncryptionEnabledForSchool(
  supabase: any,
  schoolId: string | null | undefined,
): Promise<boolean> {
  try {
    // Per-school override first (skip when school_id is null/empty).
    if (schoolId) {
      const { data: r1 } = await supabase
        .from('montree_school_features')
        .select('enabled')
        .eq('school_id', schoolId)
        .eq('feature_key', 'encryption_v1')
        .maybeSingle();
      if (r1 && typeof r1.enabled === 'boolean') {
        return r1.enabled;
      }
    }
    // Fall back to global default.
    const { data: r2 } = await supabase
      .from('montree_feature_definitions')
      .select('default_enabled')
      .eq('feature_key', 'encryption_v1')
      .maybeSingle();
    return !!r2?.default_enabled;
  } catch (err) {
    console.error('[montree-crypto] isEncryptionEnabledForSchool error:', err);
    // Fail closed — never write encrypted when we can't resolve the flag.
    // Plaintext writes are safer than half-encrypted state.
    return false;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Encrypt a write-path value when the feature flag is on. Returns
 * `{ value, version }` ready to spread into an insert/update payload.
 *
 * @example
 *   const enc = writeEncryptedField(body, encryptionEnabled);
 *   await supabase.from('montree_thread_messages').insert({
 *     thread_id: tid,
 *     body: enc.value,
 *     encryption_version: enc.version,
 *     ...
 *   });
 */
export function writeEncryptedField(
  plaintext: string,
  enabled: boolean,
): { value: string; version: 1 | null } {
  if (!enabled) {
    return { value: plaintext, version: null };
  }
  // Defense in depth — if the flag is on but the key is misconfigured,
  // fall back to plaintext rather than 500ing. Loud-log so the operator
  // notices the misconfig.
  if (!isEncryptionConfigured()) {
    console.error(
      '[montree-crypto] encryption_v1 flag ON but MONTREE_ENCRYPTION_KEY missing/invalid — falling back to plaintext write',
    );
    return { value: plaintext, version: null };
  }
  return { value: encryptField(plaintext), version: 1 };
}
