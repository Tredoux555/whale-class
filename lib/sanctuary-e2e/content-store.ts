// lib/sanctuary-e2e/content-store.ts
//
// Helpers for the e2e ciphertext store. For an e2e space the diary/projects/
// plan endpoints store the client-sent `ciphertext` blob VERBATIM and return it
// VERBATIM — the server NEVER decrypts it (and never has the key). Non-e2e
// spaces keep the existing server-key (AES-256-GCM) path untouched.
//
// SELF-DESCRIBING ROWS: a row with a non-null `ciphertext` is an e2e row (return
// the blob raw). A row with a null `ciphertext` is a legacy row (decrypt the
// *_enc columns server-side, as before). This lets a space that later converts
// hold both kinds without ambiguity, and means NO per-request e2e lookup is
// needed: the WRITE path is chosen by whether the client SENT a ciphertext.

export { isMissingColumnError } from './server-auth';

// Must match WIRE_PREFIX in crypto.ts (cross-checked by a unit test). Kept local
// so this structural validator stays free of the libsodium import.
export const WIRE_PREFIX = 'sb1';

// Generous cap for the opaque base64 blob. The legacy plaintext caps are ≤100K;
// base64 of that + nonce/tag overhead stays well under this.
export const MAX_CIPHERTEXT = 250_000;

// cipher_version stamped on e2e rows (sb1 libsodium secretbox). Distinct from
// the legacy gcm AES-256 marker (1) for honesty, though reads key on the
// presence of `ciphertext`, not this value.
export const E2E_CIPHER_VERSION = 2;

/** Structural check that a value is a well-formed `sb1.<b64>.<b64>` wire. */
export function isCiphertextWire(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith(WIRE_PREFIX + '.') &&
    value.split('.').length === 3 &&
    value.length > WIRE_PREFIX.length + 4 &&
    value.length <= MAX_CIPHERTEXT
  );
}

/** Return a valid ciphertext wire from a request body field, or null. */
export function coerceCiphertext(value: unknown): string | null {
  return isCiphertextWire(value) ? value : null;
}

/** True when a fetched row should be rendered as an e2e (ciphertext) row. */
export function rowIsE2e(row: { ciphertext?: unknown }): boolean {
  return typeof row.ciphertext === 'string' && row.ciphertext.length > 0;
}
