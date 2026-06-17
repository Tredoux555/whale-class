// tests/sanctuary-content-store.test.ts
//
// Step 5 — the ciphertext-store boundary helpers. Proves:
//   • a well-formed sb1 wire is accepted and passed through VERBATIM (the
//     "store ciphertext → get the SAME bytes back" guarantee at the validation
//     boundary; the routes assign the value to a column and read it back
//     unchanged, never transforming it);
//   • malformed / oversized / wrong-prefix input is rejected (→ legacy path);
//   • a row is rendered e2e iff it has a non-empty ciphertext;
//   • the local WIRE_PREFIX matches the crypto core (no drift).

import { describe, it, expect } from 'vitest';
import vectors from '@/lib/sanctuary-e2e/vectors.json';
import { WIRE_PREFIX as CRYPTO_WIRE_PREFIX } from '@/lib/sanctuary-e2e/crypto';
import {
  isCiphertextWire,
  coerceCiphertext,
  rowIsE2e,
  isMissingColumnError,
  WIRE_PREFIX,
  MAX_CIPHERTEXT,
  E2E_CIPHER_VERSION,
} from '@/lib/sanctuary-e2e/content-store';

const wire = (vectors as typeof vectors).expected.wire;

describe('content-store: wire validation', () => {
  it('accepts a well-formed sb1 wire and passes it through VERBATIM', () => {
    expect(isCiphertextWire(wire)).toBe(true);
    const out = coerceCiphertext(wire);
    expect(out).toBe(wire); // same bytes — no re-encode, no trim, no mutation
    expect(out).not.toBeNull();
  });

  it('rejects wrong prefix / wrong part-count / empty / non-string', () => {
    expect(isCiphertextWire('gcm:aa:bb:cc')).toBe(false);
    expect(isCiphertextWire('sb1.onlytwo')).toBe(false);
    expect(isCiphertextWire('sb1.a.b.c')).toBe(false);
    expect(isCiphertextWire('sb1.')).toBe(false);
    expect(isCiphertextWire('')).toBe(false);
    expect(isCiphertextWire(null)).toBe(false);
    expect(isCiphertextWire(12345)).toBe(false);
    expect(coerceCiphertext('nope')).toBeNull();
  });

  it('rejects an over-cap blob', () => {
    const huge = 'sb1.' + 'A'.repeat(MAX_CIPHERTEXT) + '.B';
    expect(isCiphertextWire(huge)).toBe(false);
  });
});

describe('content-store: row classification', () => {
  it('treats a row with a non-empty ciphertext as e2e', () => {
    expect(rowIsE2e({ ciphertext: wire })).toBe(true);
  });
  it('treats null/empty/missing ciphertext as legacy', () => {
    expect(rowIsE2e({ ciphertext: null })).toBe(false);
    expect(rowIsE2e({ ciphertext: '' })).toBe(false);
    expect(rowIsE2e({})).toBe(false);
  });
});

describe('content-store: constants + re-exports', () => {
  it('WIRE_PREFIX matches the crypto core (no drift)', () => {
    expect(WIRE_PREFIX).toBe(CRYPTO_WIRE_PREFIX);
    expect(WIRE_PREFIX).toBe('sb1');
  });
  it('e2e cipher_version is distinct from the legacy gcm marker (1)', () => {
    expect(E2E_CIPHER_VERSION).toBe(2);
  });
  it('re-exports isMissingColumnError', () => {
    expect(isMissingColumnError({ code: '42703' })).toBe(true);
    expect(isMissingColumnError({ code: 'PGRST204' })).toBe(true);
    expect(isMissingColumnError({ code: '23505' })).toBe(false);
  });
});
