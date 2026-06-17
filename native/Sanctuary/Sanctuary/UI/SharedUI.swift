import SwiftUI

/// Small shared UI pieces + helpers used across the three rooms.

struct EmptyHint: View {
    let icon: String
    let text: String
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon).font(.system(size: 34)).foregroundStyle(Theme.subtle)
            Text(text).foregroundStyle(Theme.subtle)
        }
    }
}

/// Locks the session (keeps biometric re-unlock for the same person).
struct LockButton: View {
    @EnvironmentObject var state: AppState
    var body: some View {
        Button { state.lock() } label: { Image(systemName: "lock.fill") }
            .foregroundStyle(Theme.subtle)
    }
}

/// A transient error bar shown at the bottom of a room.
struct ErrorBar: View {
    let message: String?
    init(_ message: String?) { self.message = message }
    var body: some View {
        if let message {
            Text(message)
                .font(.caption).foregroundStyle(.white)
                .padding(10).frame(maxWidth: .infinity)
                .background(Color.red.opacity(0.85))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .padding(.horizontal, 12).padding(.bottom, 6)
                .transition(.move(edge: .bottom))
        }
    }
}

/// Map any thrown error to a friendly, non-leaky string for the UI.
func friendly(_ error: Error) -> String {
    if let le = error as? LocalizedError, let d = le.errorDescription { return d }
    return "Something went wrong. Please try again."
}

extension ISO8601DateFormatter {
    /// "YYYY-MM-DD" — the wire date format used in the encrypted payloads.
    static let dateOnly: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f
    }()
}
