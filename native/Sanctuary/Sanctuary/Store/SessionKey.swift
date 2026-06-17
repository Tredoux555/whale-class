import Foundation
import SwiftUI

/// Holds the UNLOCKED content key in memory for the active space, and enforces
/// auto-lock: the key is wiped on background and after `AppConfig.autoLockInterval`
/// of inactivity. Locking does NOT log the user out — re-unlock is a biometric
/// Secure-Enclave unwrap (no Argon2, no password), via `SanctuaryUnlock`.
@MainActor
final class SessionKey: ObservableObject {
    @Published private(set) var isUnlocked = false
    @Published private(set) var space: String?

    /// The active content key — never persisted, never logged, wiped on lock.
    private(set) var contentKey: [UInt8]?

    private var idleTimer: Timer?
    private var observers: [NSObjectProtocol] = []

    init() {
        // Lock the instant we leave the foreground.
        let nc = NotificationCenter.default
        observers.append(nc.addObserver(
            forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main
        ) { [weak self] _ in
            Task { @MainActor in self?.lock() }
        })
        observers.append(nc.addObserver(
            forName: UIApplication.willResignActiveNotification, object: nil, queue: .main
        ) { [weak self] _ in
            Task { @MainActor in self?.lock() }
        })
    }

    deinit {
        observers.forEach { NotificationCenter.default.removeObserver($0) }
    }

    /// Mark the session unlocked with the in-memory content key. Starts the idle
    /// auto-lock timer.
    func unlock(space: String, contentKey: [UInt8]) {
        self.space = space
        self.contentKey = contentKey
        self.isUnlocked = true
        resetIdleTimer()
    }

    /// Call on any user interaction to defer auto-lock.
    func touch() {
        guard isUnlocked else { return }
        resetIdleTimer()
    }

    /// Wipe the content key from memory and lock. The space label is kept so the
    /// door can offer biometric re-unlock for the same person.
    func lock() {
        if contentKey != nil {
            // Best-effort zeroing before release.
            contentKey?.withUnsafeMutableBufferPointer { buf in
                for i in buf.indices { buf[i] = 0 }
            }
        }
        contentKey = nil
        isUnlocked = false
        idleTimer?.invalidate()
        idleTimer = nil
    }

    /// Full sign-out: lock + forget the space.
    func signOut() {
        lock()
        space = nil
    }

    private func resetIdleTimer() {
        idleTimer?.invalidate()
        idleTimer = Timer.scheduledTimer(
            withTimeInterval: AppConfig.autoLockInterval, repeats: false
        ) { [weak self] _ in
            Task { @MainActor in self?.lock() }
        }
    }
}
