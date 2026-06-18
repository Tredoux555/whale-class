import Foundation

// The device-side plaintext shapes. The ENTIRE record (title, body, mood, the
// dates she writes, status, …) is JSON-encoded and encrypted into ONE ciphertext
// blob — so nothing semantic ever reaches the server (§3). The server stores +
// returns the opaque blob; only the device can read it.

struct DiaryPayload: Codable, Equatable {
    var title: String?
    var body: String
    var mood: String?
    var date: String          // YYYY-MM-DD (the date SHE writes — inside ciphertext)
}

struct ProjectPayload: Codable, Equatable {
    var title: String
    var why: String?
    var nextAction: String?
    var status: String        // active | paused | done | dropped
    var priority: Int?
}

struct EventPayload: Codable, Equatable {
    var date: String          // YYYY-MM-DD
    var time: String?         // HH:MM or nil (all-day)
    var title: String
    var notes: String?
}

struct DiaryEntry: Identifiable { let id: String; var payload: DiaryPayload; let createdAt: String? }
struct ProjectItem: Identifiable { let id: String; var payload: ProjectPayload; let createdAt: String? }
struct EventItem: Identifiable { let id: String; var payload: EventPayload; let createdAt: String? }

/// Bridges the network (opaque ciphertext) and the UI (typed payloads): encrypts
/// on write, decrypts on read, with the in-memory contentKey. Never sends or
/// logs plaintext.
struct ContentRepository {
    let api: SanctuaryAPI
    let contentKey: [UInt8]

    // MARK: Diary
    func loadDiary() async throws -> [DiaryEntry] {
        try await api.listDiary().compactMap { row in
            guard let ct = row.ciphertext, let p: DiaryPayload = decrypt(ct) else { return nil }
            return DiaryEntry(id: row.id, payload: p, createdAt: row.created_at)
        }
    }
    func addDiary(_ p: DiaryPayload) async throws -> DiaryEntry {
        let row = try await api.createDiary(ciphertext: try encrypt(p))
        return DiaryEntry(id: row.id, payload: p, createdAt: row.created_at)
    }
    func updateDiary(id: String, _ p: DiaryPayload) async throws {
        try await api.updateDiary(id: id, ciphertext: try encrypt(p))
    }
    func deleteDiary(id: String) async throws { try await api.deleteDiary(id: id) }

    // MARK: Projects
    func loadProjects() async throws -> [ProjectItem] {
        try await api.listProjects().compactMap { row in
            guard let ct = row.ciphertext, let p: ProjectPayload = decrypt(ct) else { return nil }
            return ProjectItem(id: row.id, payload: p, createdAt: row.created_at)
        }
    }
    func addProject(_ p: ProjectPayload) async throws -> ProjectItem {
        let row = try await api.createProject(ciphertext: try encrypt(p))
        return ProjectItem(id: row.id, payload: p, createdAt: row.created_at)
    }
    func updateProject(id: String, _ p: ProjectPayload) async throws {
        try await api.updateProject(id: id, ciphertext: try encrypt(p))
    }
    func deleteProject(id: String) async throws { try await api.deleteProject(id: id) }

    // MARK: Events
    func loadEvents() async throws -> [EventItem] {
        try await api.listEvents().compactMap { row in
            guard let ct = row.ciphertext, let p: EventPayload = decrypt(ct) else { return nil }
            return EventItem(id: row.id, payload: p, createdAt: row.created_at)
        }
    }
    func addEvent(_ p: EventPayload) async throws -> EventItem {
        let row = try await api.createEvent(ciphertext: try encrypt(p))
        return EventItem(id: row.id, payload: p, createdAt: row.created_at)
    }
    func updateEvent(id: String, _ p: EventPayload) async throws {
        try await api.updateEvent(id: id, ciphertext: try encrypt(p))
    }
    func deleteEvent(id: String) async throws { try await api.deleteEvent(id: id) }

    // MARK: crypto bridge
    private func encrypt<T: Encodable>(_ value: T) throws -> String {
        let json = try JSONEncoder().encode(value)
        return try SanctuaryCrypto.encrypt(plaintext: String(decoding: json, as: UTF8.self), contentKey: contentKey)
    }
    private func decrypt<T: Decodable>(_ ciphertext: String) -> T? {
        let plain = SanctuaryCrypto.decrypt(wire: ciphertext, contentKey: contentKey)
        guard plain != SanctuaryCrypto.decryptFailureSentinel,
              let data = plain.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }
}
