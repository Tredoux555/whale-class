// lib/potato/codes.ts
// 6-character login codes — one per class (teacher door) and one per child
// (parent door). Read aloud over the phone, copied off a paper card by a parent
// standing in a hallway, so the alphabet stays uppercase and digit-light.
//
// Alphabet: A-Z plus 2-9 (34 symbols, 34^6 ≈ 1.54 billion). 0 and 1 are excluded
// — they are the only characters that could be confused with O and I, and
// dropping the digits rather than the letters keeps the code word-shaped.

import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/** A single cryptographically-random code. Not checked for uniqueness. */
export function generateCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}

/** Uppercase, strip anything outside the alphabet. Used on every code a human types. */
export function normalizeCode(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.toUpperCase().replace(/[^A-Z2-9]/g, '');
}

export function isWellFormedCode(value: string): boolean {
  return value.length === CODE_LENGTH;
}

/**
 * Mint a code that no existing row holds.
 *
 * `exists` is the caller's table-specific lookup. The loop covers the ordinary
 * collision; the caller must ALSO treat a 23505 unique-violation on insert as a
 * retry signal, because two requests can pass their checks concurrently.
 */
export async function mintUniqueCode(
  exists: (code: string) => Promise<boolean>,
  maxTries = 12,
): Promise<string> {
  for (let i = 0; i < maxTries; i++) {
    const code = generateCode();
    if (!(await exists(code))) return code;
  }
  throw new Error('Could not mint a unique code');
}

export { CODE_LENGTH };
