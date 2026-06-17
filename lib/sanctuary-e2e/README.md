# Sanctuary E2E — crypto core (TS reference)

This directory is the **TypeScript reference implementation** of the native
Sanctuary's end-to-end crypto, per `docs/SANCTUARY_NATIVE_BUILD_RUNBOOK.md` §3.

It exists for two reasons:

1. **Server-side verifier.** The e2e login route needs `crypto_generichash`
   (BLAKE2b-256) to check `auth_verifier`. Node's built-in crypto cannot produce
   a parameterised BLAKE2b-256, so we use libsodium for it.
2. **The parity contract.** `vectors.json` (added in Step 2) is a fixed-seed set
   of known-answer vectors. The Swift app's `swift-sodium` crypto must reproduce
   these byte-for-byte (proven by an XCTest). libsodium ↔ swift-sodium are the
   same C library, so the vectors are an exact contract.

## What runs where

| Function          | Client (Swift) | Server (Railway) | TS tests/vectors |
|-------------------|:--------------:|:----------------:|:----------------:|
| `crypto_pwhash` (Argon2id master key) | ✅ | ❌ (never) | ✅ |
| `crypto_kdf_derive_from_key`          | ✅ | ❌ | ✅ |
| `crypto_generichash` (auth verifier)  | ✅ | ✅ | ✅ |
| `crypto_secretbox_easy/open`          | ✅ | ❌ (stores blob) | ✅ |

The **server never runs Argon2 and never decrypts an e2e content row.** It only
verifies `generichash(authSecret)` against the stored verifier and stores/returns
the opaque `sb1.…` ciphertext blob.

## Dependency

`libsodium-wrappers-sumo` (the FULL build — includes Argon2id). The default
`libsodium-wrappers` build omits Argon2 and cannot derive the master key.
A self-contained ambient type declaration lives in
`libsodium-wrappers-sumo.d.ts` (no flaky `@types` dependency).
