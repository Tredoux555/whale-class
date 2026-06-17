// tests/sanctuary-crypto.test.ts
//
// Step 2 — known-answer + behaviour tests for the §3 crypto core.
//
//   • Regression-locks deriveMaster/Content/Auth + verifier + encrypt against
//     the committed vectors.json. A changed param (ctx string, memlimit unit,
//     subkey id, base64 variant) breaks these immediately.
//   • Proves round-trip, and that decrypt FAILS CLOSED (sentinel) on a wrong
//     key, a tampered ciphertext, and malformed input.
//   • The cross-IMPLEMENTATION proof (swift-sodium == these bytes) is the Step 7
//     XCTest, which loads the same vectors.json.

import { describe, it, expect, beforeAll } from 'vitest';
import vectors from '@/lib/sanctuary-e2e/vectors.json';
import {
  ready,
  deriveMaster,
  deriveContentKey,
  deriveAuthSecret,
  authVerifier,
  encrypt,
  encryptWithNonce,
  decrypt,
  parseWire,
  verifyAuthSecretAgainstVerifier,
  verifyLoginAuthSecretB64,
  hex,
  b64,
  unhex,
  unb64,
  randomSalt,
  randomNonce,
  DECRYPT_FAILURE_SENTINEL,
  CONTENT_KEY_CTX,
  AUTH_SECRET_CTX,
  ARGON2_MEMLIMIT,
} from '@/lib/sanctuary-e2e/crypto';

const v = vectors as typeof vectors;

let master: Uint8Array;
let contentKey: Uint8Array;
let authSecret: Uint8Array;

describe('sanctuary-e2e crypto core', () => {
  beforeAll(async () => {
    await ready();
    master = deriveMaster(v.input.password_utf8, unhex(v.input.salt_hex));
    contentKey = deriveContentKey(master);
    authSecret = deriveAuthSecret(master);
  }, 30000);

  it('locked params match the vectors (guards against silent param drift)', () => {
    expect(CONTENT_KEY_CTX).toBe('sanctctn');
    expect(AUTH_SECRET_CTX).toBe('sanctaut');
    expect(new TextEncoder().encode(CONTENT_KEY_CTX).length).toBe(8);
    expect(new TextEncoder().encode(AUTH_SECRET_CTX).length).toBe(8);
    expect(ARGON2_MEMLIMIT).toBe(134217728); // 128 MiB in BYTES
    expect(v.params.argon2.memlimit_bytes).toBe(134217728);
  });

  it('deriveMaster reproduces the KAT (Argon2id)', () => {
    expect(hex(master)).toBe(v.expected.master_hex);
    expect(master.length).toBe(32);
  });

  it('deriveContentKey reproduces the KAT', () => {
    expect(hex(contentKey)).toBe(v.expected.contentKey_hex);
    expect(contentKey.length).toBe(32);
  });

  it('deriveAuthSecret reproduces the KAT (hex + base64)', () => {
    expect(hex(authSecret)).toBe(v.expected.authSecret_hex);
    expect(b64(authSecret)).toBe(v.expected.authSecret_b64);
    expect(authSecret.length).toBe(32);
  });

  it('authVerifier reproduces the KAT (hex + base64)', () => {
    const verifier = authVerifier(authSecret);
    expect(hex(verifier)).toBe(v.expected.verifier_hex);
    expect(b64(verifier)).toBe(v.expected.verifier_b64);
    expect(verifier.length).toBe(32);
  });

  it('encryptWithNonce reproduces the exact KAT wire', () => {
    const wire = encryptWithNonce(
      v.input.plaintext_utf8,
      contentKey,
      unhex(v.input.nonce_hex),
    );
    expect(wire).toBe(v.expected.wire);
    expect(wire.startsWith('sb1.')).toBe(true);
    expect(wire.split('.')).toHaveLength(3);
  });

  it('decrypts the KAT wire back to the original plaintext (UTF-8 intact)', () => {
    expect(decrypt(v.expected.wire, contentKey)).toBe(v.input.plaintext_utf8);
  });

  it('round-trips with a fresh random nonce', () => {
    const msg = 'a quiet line ✍️';
    const wire = encrypt(msg, contentKey);
    expect(wire).not.toBe(encrypt(msg, contentKey)); // random nonce → distinct
    expect(decrypt(wire, contentKey)).toBe(msg);
  });

  it('FAILS CLOSED on a wrong content key', () => {
    const wrong = deriveContentKey(deriveMaster('a different password', randomSalt()));
    expect(decrypt(v.expected.wire, wrong)).toBe(DECRYPT_FAILURE_SENTINEL);
  });

  it('FAILS CLOSED on a tampered ciphertext (flip one byte)', () => {
    const parsed = parseWire(v.expected.wire)!;
    const ct = Uint8Array.from(parsed.ct);
    ct[ct.length - 1] ^= 0x01; // flip last byte
    const tampered = `sb1.${b64(parsed.nonce)}.${b64(ct)}`;
    expect(decrypt(tampered, contentKey)).toBe(DECRYPT_FAILURE_SENTINEL);
  });

  it('FAILS CLOSED on malformed wire', () => {
    expect(parseWire('not-a-wire')).toBeNull();
    expect(parseWire('sb1.onlytwo')).toBeNull();
    expect(parseWire('xx1.AAAA.BBBB')).toBeNull();
    expect(decrypt('garbage', contentKey)).toBe(DECRYPT_FAILURE_SENTINEL);
    expect(decrypt('', contentKey)).toBe(DECRYPT_FAILURE_SENTINEL);
  });

  it('verifies a correct authSecret against the verifier, constant-time', () => {
    const verifier = authVerifier(authSecret);
    expect(verifyAuthSecretAgainstVerifier(authSecret, verifier)).toBe(true);
    expect(verifyLoginAuthSecretB64(v.expected.authSecret_b64, v.expected.verifier_b64)).toBe(true);
  });

  it('rejects a wrong authSecret (and malformed inputs) at the verifier', () => {
    const verifier = authVerifier(authSecret);
    const wrong = deriveAuthSecret(deriveMaster('nope', randomSalt()));
    expect(verifyAuthSecretAgainstVerifier(wrong, verifier)).toBe(false);
    expect(verifyLoginAuthSecretB64(b64(randomNonce()), v.expected.verifier_b64)).toBe(false);
    expect(verifyLoginAuthSecretB64('!!not base64!!', v.expected.verifier_b64)).toBe(false);
    expect(verifyLoginAuthSecretB64(v.expected.authSecret_b64, b64(randomSalt()))).toBe(false);
  });

  it('base64 ORIGINAL round-trips bytes exactly', () => {
    const bytes = unhex(v.expected.authSecret_hex);
    expect(hex(unb64(b64(bytes)))).toBe(v.expected.authSecret_hex);
  });
});
