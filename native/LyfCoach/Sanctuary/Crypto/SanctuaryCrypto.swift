import Foundation
import Sodium

/// Swift mirror of the §3 crypto spec — MUST match `lib/sanctuary-e2e/crypto.ts`
/// byte-for-byte. The `SanctuaryCryptoTests` XCTest proves it against the shared
/// `vectors.json`. swift-sodium and libsodium-wrappers-sumo are the same C
/// library, so a passing test is a real cross-language guarantee.
///
/// TS → swift-sodium mapping:
///   crypto_pwhash(ALG_ARGON2ID13)       → sodium.pwHash.hash(... alg: .Argon2ID13)
///   crypto_kdf_derive_from_key(id, ctx) → sodium.keyDerivation.derive(index:, context:)
///   crypto_generichash(32, msg)         → sodium.genericHash.hash(message:)
///   crypto_secretbox_easy(msg, n, key)  → sodium.secretBox.seal(message:secretKey:nonce:)
///   crypto_secretbox_open_easy          → sodium.secretBox.open(authenticatedCipherText:secretKey:nonce:)
///   base64(ORIGINAL)                    → sodium.utils.bin2base64(_, variant: .ORIGINAL)
///   constant-time compare               → sodium.utils.equals
enum SanctuaryCryptoError: Error { case derivationFailed, encryptFailed }

enum SanctuaryCrypto {
    static let sodium = Sodium()

    // §3 locked constants
    static let contentKeyCtx = "sanctctn"      // EXACTLY 8 bytes
    static let authSecretCtx = "sanctaut"      // EXACTLY 8 bytes
    static let contentKeySubkeyId: UInt64 = 1
    static let authSecretSubkeyId: UInt64 = 2
    static let argon2OpsLimit = 3
    static let argon2MemLimit = 128 * 1024 * 1024   // 134217728 BYTES (not KiB)
    static let keyBytes = 32
    static let saltBytes = 16
    static let nonceBytes = 24
    static let wirePrefix = "sb1"
    static let decryptFailureSentinel = "[Encrypted — could not decrypt]"

    // ── randomness ──────────────────────────────────────────────────────────
    static func randomSalt() -> [UInt8] {
        sodium.randomBytes.buf(length: saltBytes)!
    }
    static func randomNonce() -> [UInt8] {
        sodium.randomBytes.buf(length: nonceBytes)!  // 24 bytes (crypto_secretbox_NONCEBYTES)
    }

    // ── key hierarchy ───────────────────────────────────────────────────────
    /// Argon2id master key. CLIENT-ONLY (never runs on the server).
    static func deriveMaster(password: String, salt: [UInt8]) throws -> [UInt8] {
        guard salt.count == saltBytes else { throw SanctuaryCryptoError.derivationFailed }
        guard let master = sodium.pwHash.hash(
            outputLength: keyBytes,
            passwd: Array(password.utf8),
            salt: salt,
            opsLimit: argon2OpsLimit,
            memLimit: argon2MemLimit,
            alg: .Argon2ID13
        ) else { throw SanctuaryCryptoError.derivationFailed }
        return master
    }

    static func deriveContentKey(master: [UInt8]) throws -> [UInt8] {
        guard let k = sodium.keyDerivation.derive(
            secretKey: master, index: contentKeySubkeyId, length: keyBytes, context: contentKeyCtx
        ) else { throw SanctuaryCryptoError.derivationFailed }
        return k
    }

    static func deriveAuthSecret(master: [UInt8]) throws -> [UInt8] {
        guard let k = sodium.keyDerivation.derive(
            secretKey: master, index: authSecretSubkeyId, length: keyBytes, context: authSecretCtx
        ) else { throw SanctuaryCryptoError.derivationFailed }
        return k
    }

    /// BLAKE2b-256 of authSecret — what the server stores + compares. Output
    /// length pinned to 32 explicitly (= crypto_generichash_BYTES) for parity
    /// clarity with the TS `crypto_generichash(32, authSecret)`.
    static func authVerifier(authSecret: [UInt8]) throws -> [UInt8] {
        guard let h = sodium.genericHash.hash(message: authSecret, key: nil, outputLength: keyBytes) else {
            throw SanctuaryCryptoError.derivationFailed
        }
        return h
    }

    // ── content encryption ──────────────────────────────────────────────────
    /// Encrypt → `sb1.<b64(nonce)>.<b64(ct)>`. Pass an explicit nonce only for
    /// deterministic vectors/tests; production uses a fresh random nonce.
    static func encrypt(plaintext: String, contentKey: [UInt8], nonce: [UInt8]? = nil) throws -> String {
        let n = nonce ?? randomNonce()
        guard let ct = sodium.secretBox.seal(message: Array(plaintext.utf8), secretKey: contentKey, nonce: n) else {
            throw SanctuaryCryptoError.encryptFailed
        }
        return "\(wirePrefix).\(b64(n)).\(b64(ct))"
    }

    /// Decrypt a wire string. FAILS CLOSED to the sentinel on ANY error.
    static func decrypt(wire: String, contentKey: [UInt8]) -> String {
        // Match JS split('.').length === 3 (keep empty subsequences).
        let parts = wire.split(separator: ".", omittingEmptySubsequences: false).map(String.init)
        guard parts.count == 3, parts[0] == wirePrefix,
              let nonce = unb64(parts[1]), let ct = unb64(parts[2]), nonce.count == nonceBytes
        else { return decryptFailureSentinel }
        guard let pt = sodium.secretBox.open(authenticatedCipherText: ct, secretKey: contentKey, nonce: nonce) else {
            return decryptFailureSentinel
        }
        return String(decoding: pt, as: UTF8.self)
    }

    // ── auth verification (parity with the server) ──────────────────────────
    /// Constant-time check that generichash(authSecret) == verifier.
    static func verifyAuthSecret(authSecret: [UInt8], verifier: [UInt8]) -> Bool {
        guard verifier.count == keyBytes, let computed = try? authVerifier(authSecret: authSecret) else {
            return false
        }
        return sodium.utils.equals(computed, verifier)
    }

    // ── encoding helpers (ORIGINAL base64 — the locked wire/transport variant) ─
    static func b64(_ bytes: [UInt8]) -> String {
        sodium.utils.bin2base64(bytes, variant: .ORIGINAL)!
    }
    static func unb64(_ s: String) -> [UInt8]? {
        sodium.utils.base642bin(s, variant: .ORIGINAL)
    }
    static func hex(_ bytes: [UInt8]) -> String {
        sodium.utils.bin2hex(bytes)!
    }
    static func unhex(_ s: String) -> [UInt8]? {
        sodium.utils.hex2bin(s)
    }
}
