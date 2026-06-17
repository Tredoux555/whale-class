import Foundation

/// Orchestrates the three unlock paths over `SanctuaryCrypto` + `KeyStore` +
/// `SecureEnclaveKeyWrap`:
///   1. prepareClaim       — first setup (new e2e account)
///   2. unlockWithPassword — derive from password + salt (Argon2)
///   3. unlockWithBiometrics — Secure-Enclave unwrap, no Argon2 / no password
///
/// After (1) or (2) the contentKey AND authSecret are SE-wrapped together so a
/// later biometric unlock restores BOTH (seamless local read + network
/// re-login) without re-running Argon2. Storing the authSecret adds no exposure
/// beyond the contentKey on an already-unlocked device (the honest ceiling),
/// and removes the need to ever re-type the password on this device.
enum SanctuaryUnlock {
    enum UnlockError: Error { case weakPassword, noBiometricKey, corruptWrappedBlob }

    struct Keys {
        let contentKey: [UInt8]   // 32 bytes
        let authSecret: [UInt8]   // 32 bytes
    }

    /// First setup. Generates a fresh salt, derives the keys, SE-wraps + caches
    /// them, and returns what the CLAIM endpoint needs ({kdf_salt, auth_verifier}
    /// base64) plus the unlocked keys.
    static func prepareClaim(space: String, password: String) throws
        -> (saltB64: String, verifierB64: String, keys: Keys) {
        guard isStrong(password) else { throw UnlockError.weakPassword }
        let salt = SanctuaryCrypto.randomSalt()
        let keys = try derive(password: password, salt: salt)
        let verifier = try SanctuaryCrypto.authVerifier(authSecret: keys.authSecret)
        try persist(space: space, salt: salt, keys: keys)
        return (SanctuaryCrypto.b64(salt), SanctuaryCrypto.b64(verifier), keys)
    }

    /// Password unlock (login). `salt` comes from the device cache, or is fetched
    /// from the server (`{ e2eBegin: true }`) on a fresh install.
    static func unlockWithPassword(space: String, password: String, salt: [UInt8]) throws -> Keys {
        let keys = try derive(password: password, salt: salt)
        try persist(space: space, salt: salt, keys: keys)
        return keys
    }

    /// Biometric unlock — Secure-Enclave unwrap. Triggers Face ID/passcode.
    /// No Argon2, no password.
    static func unlockWithBiometrics(space: String, reason: String) throws -> Keys {
        guard let wrapped = KeyStore.loadWrappedKey(for: space) else {
            throw UnlockError.noBiometricKey
        }
        let combined = try SecureEnclaveKeyWrap.unwrap(wrapped, for: space, reason: reason)
        guard combined.count == 64 else { throw UnlockError.corruptWrappedBlob }
        return Keys(contentKey: Array(combined[0..<32]), authSecret: Array(combined[32..<64]))
    }

    static func canUseBiometrics(space: String) -> Bool {
        KeyStore.hasBiometricUnlock(for: space)
    }

    static func cachedSalt(space: String) -> [UInt8]? {
        KeyStore.loadSalt(for: space)
    }

    /// Strong-password gate (§3): ≥ minPasswordLength chars OR a multi-word
    /// passphrase. Warn (and refuse on claim) below this — the residual is an
    /// offline dictionary attack on a weak password if the server is compromised.
    static func isStrong(_ password: String) -> Bool {
        if password.count >= AppConfig.minPasswordLength { return true }
        let words = password.split(separator: " ").filter { !$0.isEmpty }
        return words.count >= 3
    }

    // MARK: - private

    private static func derive(password: String, salt: [UInt8]) throws -> Keys {
        let master = try SanctuaryCrypto.deriveMaster(password: password, salt: salt)
        let contentKey = try SanctuaryCrypto.deriveContentKey(master: master)
        let authSecret = try SanctuaryCrypto.deriveAuthSecret(master: master)
        return Keys(contentKey: contentKey, authSecret: authSecret)
    }

    private static func persist(space: String, salt: [UInt8], keys: Keys) throws {
        let combined = keys.contentKey + keys.authSecret // 64 bytes
        let blob = try SecureEnclaveKeyWrap.wrap(secret: combined, for: space)
        KeyStore.saveWrappedKey(blob, for: space)
        KeyStore.saveSalt(salt, for: space)
    }
}
