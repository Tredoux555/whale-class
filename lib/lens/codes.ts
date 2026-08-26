// lib/lens/codes.ts
// The 8-character invite code that is the whole front door of Montree Lens.
//
// Same alphabet as Potato Snaps (A-Z plus 2-9 — 0 and 1 dropped because they
// are the only characters confusable with O and I), two characters longer:
// a Potato code guards one classroom's photo board, a Lens code guards a
// consultant's entire client list. 34^8 ≈ 1.8 trillion.

import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 8;

/** A single cryptographically-random code. Not checked for uniqueness. */
export function generateCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}

/** Uppercase, strip anything outside the alphabet. Used on every typed code. */
export function normalizeCode(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.toUpperCase().replace(/[^A-Z2-9]/g, '');
}

export function isWellFormedCode(value: string): boolean {
  return value.length === CODE_LENGTH;
}

/**
 * Mint a code no existing row holds.
 *
 * `exists` is the caller's lookup. The loop covers the ordinary collision; a
 * caller that inserts must ALSO treat a 23505 unique violation as a retry
 * signal, because two requests can pass their checks concurrently.
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
