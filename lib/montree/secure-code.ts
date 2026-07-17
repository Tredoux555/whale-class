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
