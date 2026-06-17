import Foundation

/// Talks to the e2e backend (Steps 4 + 5). Auth is `Authorization: Bearer <JWT>`
/// (the native client uses the header, not the cookie). The ONLY plaintext that
/// ever leaves the device is the explicit cloud-coach turn (Coach/, Step 11);
/// every journal/project/planner field travels as an opaque `sb1.…` ciphertext.
struct SanctuaryAPI {
    var baseURL = AppConfig.apiBaseURL
    /// The session JWT from claim/login. nil until authenticated.
    var token: String?

    enum APIError: LocalizedError {
        case http(Int, String), decode, noSession, notE2eEnabled
        var errorDescription: String? {
            switch self {
            case .http(let code, let msg): return "Server error \(code): \(msg)"
            case .decode: return "Unexpected response from the server."
            case .noSession: return "Not signed in."
            case .notE2eEnabled: return "End-to-end accounts are not enabled on the server yet (run migration 265)."
            }
        }
    }

    // MARK: - Auth

    /// First setup. Registers { kdf_salt, auth_verifier } and returns the session.
    func claim(username: String, kdfSaltB64: String, authVerifierB64: String) async throws -> String {
        let body = ["username": username, "kdf_salt": kdfSaltB64, "auth_verifier": authVerifierB64]
        let resp: SessionResponse = try await post("/api/story/admin/auth/claim", body: body, authed: false)
        return resp.session
    }

    /// Fresh-device salt fetch: the salt is not secret (§3).
    func fetchSalt(username: String) async throws -> String? {
        let body: [String: Any] = ["username": username, "e2eBegin": true]
        let resp: SaltResponse = try await post("/api/story/admin/auth", body: body, authed: false)
        return resp.kdf_salt
    }

    /// Login with the derived authSecret (the server never sees the password).
    func login(username: String, authSecretB64: String) async throws -> String {
        let body = ["username": username, "authSecret": authSecretB64]
        let resp: SessionResponse = try await post("/api/story/admin/auth", body: body, authed: false)
        return resp.session
    }

    // MARK: - Content (opaque ciphertext only)

    func listDiary() async throws -> [ContentRow] {
        let resp: DiaryListResponse = try await get("/api/story/diary")
        return resp.entries
    }
    func createDiary(ciphertext: String) async throws -> ContentRow {
        let resp: DiaryItemResponse = try await post("/api/story/diary", body: ["ciphertext": ciphertext])
        return resp.entry
    }
    func updateDiary(id: String, ciphertext: String) async throws {
        let _: DiaryItemResponse = try await patch("/api/story/diary/\(id)", body: ["ciphertext": ciphertext])
    }
    func deleteDiary(id: String) async throws { try await delete("/api/story/diary/\(id)") }

    func listProjects() async throws -> [ContentRow] {
        let resp: ProjectListResponse = try await get("/api/story/projects")
        return resp.projects
    }
    func createProject(ciphertext: String) async throws -> ContentRow {
        let resp: ProjectItemResponse = try await post("/api/story/projects", body: ["ciphertext": ciphertext])
        return resp.project
    }
    func updateProject(id: String, ciphertext: String) async throws {
        let _: ProjectItemResponse = try await patch("/api/story/projects/\(id)", body: ["ciphertext": ciphertext])
    }
    func deleteProject(id: String) async throws { try await delete("/api/story/projects/\(id)") }

    func listEvents(from: String? = nil, to: String? = nil) async throws -> [ContentRow] {
        var path = "/api/story/events"
        var q: [String] = []
        if let from { q.append("from=\(from)") }
        if let to { q.append("to=\(to)") }
        if !q.isEmpty { path += "?" + q.joined(separator: "&") }
        let resp: EventListResponse = try await get(path)
        return resp.events
    }
    func createEvent(ciphertext: String) async throws -> ContentRow {
        let resp: EventItemResponse = try await post("/api/story/events", body: ["ciphertext": ciphertext])
        return resp.event
    }
    func updateEvent(id: String, ciphertext: String) async throws {
        struct OK: Decodable { let ok: Bool? }
        let _: OK = try await patch("/api/story/events/\(id)", body: ["ciphertext": ciphertext])
    }
    func deleteEvent(id: String) async throws { try await delete("/api/story/events/\(id)") }

    // MARK: - HTTP primitives

    private func get<T: Decodable>(_ path: String) async throws -> T {
        try await send(path, method: "GET", body: nil, authed: true)
    }
    private func post<T: Decodable>(_ path: String, body: [String: Any], authed: Bool = true) async throws -> T {
        try await send(path, method: "POST", body: body, authed: authed)
    }
    private func patch<T: Decodable>(_ path: String, body: [String: Any]) async throws -> T {
        try await send(path, method: "PATCH", body: body, authed: true)
    }
    private func delete(_ path: String) async throws {
        struct OK: Decodable { let ok: Bool? }
        let _: OK = try await send(path, method: "DELETE", body: nil, authed: true)
    }

    private func send<T: Decodable>(_ path: String, method: String, body: [String: Any]?, authed: Bool) async throws -> T {
        // Build the URL by string concatenation so query strings (?from=&to=) are
        // preserved (URL.appendingPathComponent would percent-encode them).
        guard let url = URL(string: baseURL.absoluteString + path) else { throw APIError.decode }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if authed {
            guard let token else { throw APIError.noSession }
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.decode }
        if http.statusCode == 503 { throw APIError.notE2eEnabled }
        guard (200..<300).contains(http.statusCode) else {
            let msg = (try? JSONDecoder().decode(ErrorResponse.self, from: data))?.error ?? "request failed"
            throw APIError.http(http.statusCode, msg)
        }
        do { return try JSONDecoder().decode(T.self, from: data) }
        catch { throw APIError.decode }
    }
}

// MARK: - Wire models

/// An e2e content row as returned by the backend: id + opaque ciphertext + times.
struct ContentRow: Decodable, Identifiable {
    let id: String
    let ciphertext: String?
    let created_at: String?
    let updated_at: String?
}

private struct SessionResponse: Decodable { let session: String }
private struct SaltResponse: Decodable { let e2e: Bool?; let kdf_salt: String? }
private struct ErrorResponse: Decodable { let error: String? }
private struct DiaryListResponse: Decodable { let entries: [ContentRow] }
private struct DiaryItemResponse: Decodable { let entry: ContentRow }
private struct ProjectListResponse: Decodable { let projects: [ContentRow] }
private struct ProjectItemResponse: Decodable { let project: ContentRow }
private struct EventListResponse: Decodable { let events: [ContentRow] }
private struct EventItemResponse: Decodable { let event: ContentRow }
