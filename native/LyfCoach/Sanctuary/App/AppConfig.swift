import Foundation

/// Static configuration for the Sanctuary app.
enum AppConfig {
    /// The e2e backend base URL (the Steps 4/5 routes live under /api/story).
    /// montree.xyz is the live domain (teacherpotato.xyz is retired).
    static let apiBaseURL = URL(string: "https://montree.xyz")!

    /// Auto-lock after this idle interval (wipes the in-memory content key).
    static let autoLockInterval: TimeInterval = 15 * 60

    /// Strong-password gate (§3): minimum length OR a passphrase. We warn below
    /// this; the honest residual (offline dictionary attack on a weak password
    /// if the server is compromised at login) is why this matters.
    static let minPasswordLength = 10

    /// The known sanctuary spaces. A space is chosen at the door; auth + content
    /// are fully scoped to it server-side (from the JWT, never the client body).
    static let spaces = ["tredoux", "bayan", "riddick"]
}
