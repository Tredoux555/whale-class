// Local ambient type declaration for `libsodium-wrappers-sumo`.
//
// WHY LOCAL: the published `@types/libsodium-wrappers-sumo` versions are
// unreliable to pin in this build env (notarget). Rather than add a flaky
// devDependency, we declare exactly the surface the Sanctuary crypto core uses
// (lib/sanctuary-e2e/crypto.ts) and nothing more. This keeps `tsc` honest about
// our calls while staying self-contained.
//
// The `-sumo` build is the FULL-algorithm libsodium (includes Argon2id /
// crypto_pwhash). The default (non-sumo) build omits Argon2 to save size — see
// SANCTUARY_NATIVE_BUILD_RUNBOOK §3.

declare module 'libsodium-wrappers-sumo' {
  export interface Base64Variants {
    ORIGINAL: number;
    ORIGINAL_NO_PADDING: number;
    URLSAFE: number;
    URLSAFE_NO_PADDING: number;
  }

  export interface Libsodium {
    /** Resolves when the WASM module has finished initialising. */
    ready: Promise<void>;

    // --- Password hashing (Argon2id) ---
    crypto_pwhash(
      keyLength: number,
      password: string | Uint8Array,
      salt: Uint8Array,
      opsLimit: number,
      memLimit: number,
      algorithm: number,
    ): Uint8Array;
    readonly crypto_pwhash_ALG_ARGON2ID13: number;
    readonly crypto_pwhash_SALTBYTES: number;
    readonly crypto_pwhash_OPSLIMIT_MIN: number;
    readonly crypto_pwhash_MEMLIMIT_MIN: number;

    // --- Key derivation (BLAKE2b-based KDF) ---
    crypto_kdf_derive_from_key(
      subkeyLength: number,
      subkeyId: number,
      ctx: string,
      key: Uint8Array,
    ): Uint8Array;
    readonly crypto_kdf_KEYBYTES: number;

    // --- Keyed/unkeyed generic hash (BLAKE2b) ---
    crypto_generichash(
      hashLength: number,
      message: string | Uint8Array,
      key?: Uint8Array | null,
    ): Uint8Array;
    readonly crypto_generichash_BYTES: number;

    // --- Authenticated symmetric encryption (XSalsa20-Poly1305) ---
    crypto_secretbox_easy(
      message: string | Uint8Array,
      nonce: Uint8Array,
      key: Uint8Array,
    ): Uint8Array;
    crypto_secretbox_open_easy(
      ciphertext: Uint8Array,
      nonce: Uint8Array,
      key: Uint8Array,
    ): Uint8Array;
    readonly crypto_secretbox_NONCEBYTES: number;
    readonly crypto_secretbox_KEYBYTES: number;

    // --- Utilities ---
    randombytes_buf(length: number): Uint8Array;
    /** Constant-time comparison. Returns true when equal. */
    memcmp(b1: Uint8Array, b2: Uint8Array): boolean;
    to_base64(input: string | Uint8Array, variant?: number): string;
    from_base64(input: string, variant?: number): Uint8Array;
    to_hex(input: string | Uint8Array): string;
    from_hex(input: string): Uint8Array;
    from_string(input: string): Uint8Array;
    to_string(bytes: Uint8Array): string;
    readonly base64_variants: Base64Variants;
  }

  const sodium: Libsodium;
  export default sodium;
}
