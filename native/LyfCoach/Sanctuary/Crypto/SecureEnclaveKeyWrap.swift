import Foundation
import Security
import LocalAuthentication

/// Wraps the symmetric `contentKey` with a per-space key generated INSIDE the
/// Secure Enclave (§3). The Enclave key never leaves the chip; its private-key
/// usage is gated by biometrics/passcode. We ECIES-encrypt the contentKey with
/// the Enclave key's public key, store the wrapped blob, and decrypt it (Face ID
/// prompt) on each unlock — so after the first password unlock we never re-run
/// Argon2 or need the password again on this device.
enum SecureEnclaveKeyWrap {
    enum SEError: Error { case create(String), notFound, encrypt(String), decrypt(String), unsupported }

    private static let eciesAlgorithm: SecKeyAlgorithm =
        .eciesEncryptionCofactorVariableIVX963SHA256AESGCM

    private static func tag(for space: String) -> Data {
        "xyz.montree.sanctuary.se.\(space)".data(using: .utf8)!
    }

    /// Create (once) the Secure-Enclave private key for a space, biometric-gated.
    @discardableResult
    static func ensureKey(for space: String) throws -> SecKey {
        if let existing = try? loadPrivateKey(for: space, context: nil) { return existing }

        var acError: Unmanaged<CFError>?
        guard let access = SecAccessControlCreateWithFlags(
            kCFAllocatorDefault,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            [.privateKeyUsage, .biometryCurrentSet],
            &acError
        ) else {
            throw SEError.create("access control: \(describe(acError))")
        }

        let attributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: true,
                kSecAttrApplicationTag as String: tag(for: space),
                kSecAttrAccessControl as String: access,
            ],
        ]

        var error: Unmanaged<CFError>?
        guard let key = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
            throw SEError.create(describe(error))
        }
        return key
    }

    /// True once a Secure-Enclave key exists for this space (biometric unlock
    /// can be offered).
    static func hasKey(for space: String) -> Bool {
        (try? loadPrivateKey(for: space, context: nil)) != nil
    }

    /// ECIES-encrypt arbitrary secret bytes (here: contentKey||authSecret) with
    /// the Enclave key's PUBLIC key. No biometric prompt (public-key op). The
    /// blob is safe to store at rest.
    static func wrap(secret: [UInt8], for space: String) throws -> Data {
        let priv = try ensureKey(for: space)
        guard let pub = SecKeyCopyPublicKey(priv) else { throw SEError.notFound }
        guard SecKeyIsAlgorithmSupported(pub, .encrypt, eciesAlgorithm) else { throw SEError.unsupported }
        var error: Unmanaged<CFError>?
        guard let wrapped = SecKeyCreateEncryptedData(
            pub, eciesAlgorithm, Data(secret) as CFData, &error
        ) as Data? else {
            throw SEError.encrypt(describe(error))
        }
        return wrapped
    }

    /// ECIES-decrypt the wrapped contentKey with the Enclave PRIVATE key. This
    /// triggers the biometric/passcode prompt (private-key usage is gated).
    /// `reason` is shown in the Face ID sheet.
    static func unwrap(_ wrapped: Data, for space: String, reason: String) throws -> [UInt8] {
        let context = LAContext()
        context.localizedReason = reason
        let priv = try loadPrivateKey(for: space, context: context)
        guard SecKeyIsAlgorithmSupported(priv, .decrypt, eciesAlgorithm) else { throw SEError.unsupported }
        var error: Unmanaged<CFError>?
        guard let plain = SecKeyCreateDecryptedData(
            priv, eciesAlgorithm, wrapped as CFData, &error
        ) as Data? else {
            throw SEError.decrypt(describe(error))
        }
        return [UInt8](plain)
    }

    /// Delete the Secure-Enclave key for a space (logout / reset).
    static func deleteKey(for space: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: tag(for: space),
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
        ]
        SecItemDelete(query as CFDictionary)
    }

    // MARK: - private

    /// Fetch the stored Enclave private key. Passing an LAContext lets the caller
    /// control the biometric prompt for the subsequent private-key operation.
    private static func loadPrivateKey(for space: String, context: LAContext?) throws -> SecKey {
        var query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: tag(for: space),
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecReturnRef as String: true,
        ]
        if let context { query[kSecUseAuthenticationContext as String] = context }

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let item else { throw SEError.notFound }
        return (item as! SecKey)
    }

    private static func describe(_ error: Unmanaged<CFError>?) -> String {
        guard let error else { return "unknown" }
        return (error.takeRetainedValue() as Error).localizedDescription
    }
}
