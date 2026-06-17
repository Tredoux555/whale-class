import Foundation
import Security

/// On-device storage for the per-space unlock material:
///   • the SE-wrapped contentKey blob (biometric unlock path), and
///   • the kdf_salt (NOT secret — lets the device re-derive from the password
///     without a server round-trip, and on a fresh install after fetching it).
/// Both are kept in the Keychain with `ThisDeviceOnly` accessibility. The
/// Secure-Enclave private key that actually protects the contentKey lives in
/// `SecureEnclaveKeyWrap`.
enum KeyStore {
    private static let service = "xyz.montree.sanctuary"

    private enum Slot: String { case wrappedKey = "wrapped-key", salt = "kdf-salt" }

    private static func account(_ slot: Slot, _ space: String) -> String {
        "\(slot.rawValue):\(space)"
    }

    // MARK: wrapped contentKey

    static func saveWrappedKey(_ blob: Data, for space: String) {
        set(blob, slot: .wrappedKey, space: space)
    }
    static func loadWrappedKey(for space: String) -> Data? {
        get(slot: .wrappedKey, space: space)
    }
    static func hasBiometricUnlock(for space: String) -> Bool {
        loadWrappedKey(for: space) != nil && SecureEnclaveKeyWrap.hasKey(for: space)
    }

    // MARK: salt (non-secret)

    static func saveSalt(_ salt: [UInt8], for space: String) {
        set(Data(salt), slot: .salt, space: space)
    }
    static func loadSalt(for space: String) -> [UInt8]? {
        guard let d = get(slot: .salt, space: space) else { return nil }
        return [UInt8](d)
    }

    // MARK: lifecycle

    /// Wipe everything for a space (logout / reset): wrapped key, salt, SE key.
    static func clear(for space: String) {
        delete(slot: .wrappedKey, space: space)
        delete(slot: .salt, space: space)
        SecureEnclaveKeyWrap.deleteKey(for: space)
    }

    // MARK: - Keychain primitives

    private static func set(_ data: Data, slot: Slot, space: String) {
        let acct = account(slot, space)
        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: acct,
        ]
        SecItemDelete(base as CFDictionary) // idempotent overwrite
        var add = base
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        SecItemAdd(add as CFDictionary, nil)
    }

    private static func get(slot: Slot, space: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account(slot, space),
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return data
    }

    private static func delete(slot: Slot, space: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account(slot, space),
        ]
        SecItemDelete(query as CFDictionary)
    }
}
