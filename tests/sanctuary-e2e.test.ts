// Sanctuary E2E — Step 1 smoke test (harness only).
//
// Confirms libsodium-wrappers-sumo initialises in the test env and exposes the
// FULL algorithm surface the crypto core (Step 2) depends on — most importantly
// Argon2id (`crypto_pwhash`), which the default non-sumo build omits.
//
// No Sanctuary logic is exercised here yet. Step 2 adds crypto.test.ts with the
// known-answer vectors.

import { describe, it, expect, beforeAll } from 'vitest';
import _sodium from 'libsodium-wrappers-sumo';

describe('sanctuary-e2e: libsodium harness', () => {
  beforeAll(async () => {
    await _sodium.ready;
  });

  it('initialises the sumo (full) build with Argon2id available', () => {
    expect(typeof _sodium.crypto_pwhash).toBe('function');
    expect(_sodium.crypto_pwhash_ALG_ARGON2ID13).toBe(2);
    expect(_sodium.crypto_pwhash_SALTBYTES).toBe(16);
  });

  it('exposes the KDF, generichash and secretbox primitives §3 needs', () => {
    expect(typeof _sodium.crypto_kdf_derive_from_key).toBe('function');
    expect(typeof _sodium.crypto_generichash).toBe('function');
    expect(typeof _sodium.crypto_secretbox_easy).toBe('function');
    expect(typeof _sodium.crypto_secretbox_open_easy).toBe('function');
    expect(_sodium.crypto_secretbox_NONCEBYTES).toBe(24);
    expect(_sodium.crypto_secretbox_KEYBYTES).toBe(32);
    expect(_sodium.crypto_kdf_KEYBYTES).toBe(32);
    expect(_sodium.crypto_generichash_BYTES).toBe(32);
  });

  it('does a secretbox round-trip (sanity that the WASM actually computes)', () => {
    const key = _sodium.randombytes_buf(_sodium.crypto_secretbox_KEYBYTES);
    const nonce = _sodium.randombytes_buf(_sodium.crypto_secretbox_NONCEBYTES);
    const msg = _sodium.from_string('sanctuary');
    const ct = _sodium.crypto_secretbox_easy(msg, nonce, key);
    const pt = _sodium.crypto_secretbox_open_easy(ct, nonce, key);
    expect(_sodium.to_string(pt)).toBe('sanctuary');
  });
});
