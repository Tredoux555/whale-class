// lib/montree/secure-code.ts
//
// Crypto-safe short-code generator for CREDENTIALS ONLY (login codes,
// signup/invite codes, access codes, referral codes). Uses crypto.randomBytes
// with rejection sampling so there is NO modulo bias across the alphabet.
//
// Do NOT use this for ref ids, cache-busters, jitter, or any non-credential
// value — Math.random is fine there.

import { randomBytes } from 'crypto';

// No 0/O/1/I — the house 32-char unambiguous set.
const DEFAULT_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Split alphabets for the temporary-password builder below. Same unambiguous house set,
// partitioned so each class can be drawn from deliberately.
const UPPER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER_ALPHABET = 'abcdefghjkmnpqrstuvwxyz';
const DIGIT_ALPHABET = '23456789';

export function generateSecureCode(length = 6, alphabet = DEFAULT_ALPHABET): string {
  const n = alphabet.length;
  if (length <= 0 || n === 0) return '';

  // Largest multiple of n that fits in a byte; bytes >= this are rejected to
  // avoid modulo bias.
  const maxUnbiased = Math.floor(256 / n) * n;

  let out = '';
  while (out.length < length) {
    const buf = randomBytes(length - out.length);
    for (let i = 0; i < buf.length && out.length < length; i++) {
      const b = buf[i];
      if (b >= maxUnbiased) continue; // reject to keep the distribution uniform
      out += alphabet[b % n];
    }
  }
  return out;
}

/**
 * A temporary password that is GUARANTEED to satisfy lib/password-policy.ts
 * (8+ chars, an uppercase, a lowercase, a digit, never a common password).
 *
 * Used when an administrator resets somebody else's password and has to read
 * the result back to them — a principal resetting a teacher's password, or the
 * platform owner resetting a director's. Shape is fixed at 4 upper + 4 lower +
 * 2 digits (e.g. KRTPmnqx47) so it is unambiguous over the phone: the house
 * alphabet already drops 0/O/1/I/l, and the classes never interleave, so there
 * is no "is that an uppercase or lowercase?" moment mid-string.
 *
 * ~10^15 possibilities. It is meant to be changed by its owner afterwards, but
 * it is not a weak password in the meantime.
 */
export function generateTempPassword(): string {
  return (
    generateSecureCode(4, UPPER_ALPHABET) +
    generateSecureCode(4, LOWER_ALPHABET) +
    generateSecureCode(2, DIGIT_ALPHABET)
  );
}
