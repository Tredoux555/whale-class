import Foundation

/// The "deeper coach" — the EXPLICIT, per-message cloud opt-in (§2 hybrid).
/// Sends the device-assembled context (recent conversation + this turn, all
/// decrypted on-device) to the Sonnet coach at /api/story/coach (SSE). For an
/// e2e space the backend answers but persists NOTHING readable (Step 5; the
/// server verifies e2e from the DB, not from this request).
///
/// This is the ONLY path on which plaintext leaves the device, and it never
/// happens by default — only when the person taps "ask the deeper coach" (or
/// knowingly sends while on a device without on-device AI, with the banner
/// disclosure showing).
struct CloudCoach {
    var baseURL = AppConfig.apiBaseURL
    let token: String

    /// Stream the reply. `onDelta` receives each text chunk as it arrives.
    func ask(
        space: String,
        history: [CoachMessage],
        question: String,
        conversationId: String,
        onDelta: @escaping (String) -> Void
    ) async throws {
        let url = URL(string: baseURL.absoluteString + "/api/story/coach")!
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        let body: [String: Any] = [
            "question": question,
            "conversation_id": conversationId,
            "history": history.map {
                ["role": $0.role == .user ? "user" : "assistant", "content": $0.text]
            },
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (bytes, response) = try await URLSession.shared.bytes(for: req)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let code = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw SanctuaryAPI.APIError.http(code, "The deeper coach is unavailable right now.")
        }

        for try await line in bytes.lines {
            // SSE: `:keepalive` comment lines and blank lines are ignored.
            guard line.hasPrefix("data:") else { continue }
            let payload = line.dropFirst("data:".count).trimmingCharacters(in: .whitespaces)
            guard let data = payload.data(using: .utf8),
                  let evt = try? JSONDecoder().decode(CoachEvent.self, from: data) else { continue }
            switch evt.type {
            case "text": if let t = evt.text { onDelta(t) }
            case "error": throw SanctuaryAPI.APIError.http(500, evt.error ?? "coach error")
            case "done": return
            default: break
            }
        }
    }

    private struct CoachEvent: Decodable {
        let type: String
        let text: String?
        let error: String?
    }
}
