import Foundation
#if canImport(FoundationModels)
import FoundationModels
#endif

/// A message in the coach conversation. Kept on-device by default.
struct CoachMessage: Identifiable, Equatable {
    enum Role { case user, coach }
    let id = UUID()
    let role: Role
    var text: String
    var viaCloud: Bool = false
}

enum CoachError: LocalizedError {
    case unavailable
    var errorDescription: String? { "The on-device coach isn't available on this device." }
}

/// The DEFAULT coach: Apple's on-device Foundation model (iOS 26+, Apple-
/// Intelligence devices). Everything stays on the device. Availability is
/// verified at runtime; when unsupported the UI falls back to the cloud coach
/// with a clear disclosure.
///
/// API confirmed against the current FoundationModels docs (post-cutoff):
///   SystemLanguageModel.default.availability  → .available / .unavailable
///   LanguageModelSession(instructions:)       → inject the persona
///   try await session.respond(to:).content    → the reply text
enum OnDeviceCoach {
    enum Availability { case available, unavailable(String) }

    static func availability() -> Availability {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            switch SystemLanguageModel.default.availability {
            case .available:
                return .available
            case .unavailable:
                return .unavailable("On-device AI is unavailable — enable Apple Intelligence in Settings, or this device may not support it.")
            @unknown default:
                return .unavailable("On-device AI is unavailable right now.")
            }
        }
        #endif
        return .unavailable("On-device AI needs iOS 26 on an Apple-Intelligence device.")
    }

    static var isAvailable: Bool {
        if case .available = availability() { return true }
        return false
    }

    /// One-shot response from the on-device model with the coach persona.
    /// `history` (kept on-device) is folded into the prompt because the small
    /// model has a limited context window.
    static func respond(space: String, history: [CoachMessage], prompt: String) async throws -> String {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *), isAvailable {
            let session = LanguageModelSession(instructions: { CoachPersona.instructions(for: space) })
            let result = try await session.respond(to: composePrompt(history: history, prompt: prompt))
            return result.content
        }
        #endif
        throw CoachError.unavailable
    }

    private static func composePrompt(history: [CoachMessage], prompt: String) -> String {
        guard !history.isEmpty else { return prompt }
        let recent = history.suffix(8)
            .map { "\($0.role == .user ? "Me" : "You"): \($0.text)" }
            .joined(separator: "\n")
        return "Our recent conversation:\n\(recent)\n\nMe: \(prompt)"
    }
}
