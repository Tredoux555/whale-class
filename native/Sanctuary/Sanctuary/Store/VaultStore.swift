import Foundation

/// The Vault — Tredoux-only. A device-key end-to-end store for the most
/// sensitive secrets. Mirrors the web rule that the vault belongs to ONE space
/// (`tredoux`) — every read/write here refuses any other space.
///
/// v1 scope (source-complete): encrypted TEXT secrets, stored ON DEVICE only as
/// `sb1.…` ciphertext in a file-protected local file. The contentKey lives in
/// the Secure Enclave + memory, so even a device backup / file extraction yields
/// only ciphertext. Because nothing leaves the device, this surface cannot leak
/// server-side. (Server-synced encrypted MEDIA vault is a documented follow-up —
/// it needs an additive backend e2e vault content route, like Steps 3+5.)
struct VaultStore {
    static let ownerSpace = "tredoux"

    let contentKey: [UInt8]
    let space: String

    var isOwner: Bool { space == VaultStore.ownerSpace }

    private var fileURL: URL {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return dir.appendingPathComponent("vault-\(space).enc")
    }

    func load() -> [VaultSecret] {
        guard isOwner,
              let data = try? Data(contentsOf: fileURL),
              let lines = try? JSONDecoder().decode([String].self, from: data)
        else { return [] }
        return lines.compactMap { decrypt($0) }.sorted { $0.createdAt > $1.createdAt }
    }

    /// Persist the full set (each secret re-encrypted with a fresh nonce). The
    /// file is written with complete file protection (iOS-encrypted at rest too).
    func save(_ secrets: [VaultSecret]) {
        guard isOwner else { return }
        let ciphertexts = secrets.compactMap { encrypt($0) }
        guard let data = try? JSONEncoder().encode(ciphertexts) else { return }
        try? data.write(to: fileURL, options: [.completeFileProtection, .atomic])
    }

    func wipe() {
        try? FileManager.default.removeItem(at: fileURL)
    }

    // MARK: crypto bridge (device contentKey)
    private func encrypt(_ secret: VaultSecret) -> String? {
        guard let json = try? JSONEncoder().encode(secret) else { return nil }
        return try? SanctuaryCrypto.encrypt(
            plaintext: String(decoding: json, as: UTF8.self), contentKey: contentKey
        )
    }
    private func decrypt(_ ciphertext: String) -> VaultSecret? {
        let plain = SanctuaryCrypto.decrypt(wire: ciphertext, contentKey: contentKey)
        guard plain != SanctuaryCrypto.decryptFailureSentinel,
              let data = plain.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(VaultSecret.self, from: data)
    }
}

struct VaultSecret: Codable, Identifiable, Equatable {
    var id: String = UUID().uuidString
    var title: String
    var body: String
    var createdAt: String = ISO8601DateFormatter().string(from: Date())
}
