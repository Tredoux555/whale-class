import Foundation
import SwiftUI

/// App-wide state: ties auth (`SanctuaryAPI`) + key lifecycle (`SanctuaryUnlock`,
/// `SessionKey`) together and exposes a `ContentRepository` to the UI once
/// unlocked. The entered name at the door IS the login username (the family's
/// e2e accounts should be created with username == space label — see VERIFY.md).
@MainActor
final class AppState: ObservableObject {
    @Published var session = SessionKey()
    @Published var username: String?
    @Published var errorMessage: String?
    @Published var isBusy = false

    private var api = SanctuaryAPI()

    var isUnlocked: Bool { session.isUnlocked }

    func canUseBiometrics(for username: String) -> Bool {
        SanctuaryUnlock.canUseBiometrics(space: username)
    }

    /// A repository for content ops, valid only while unlocked.
    func repository() -> ContentRepository? {
        guard let key = session.contentKey, api.token != nil else { return nil }
        return ContentRepository(api: api, contentKey: key)
    }

    /// The active account/space label (= the login username).
    var coachSpace: String { username ?? "" }

    /// A cloud-coach client for the explicit "deeper coach" opt-in. Valid only
    /// while unlocked + authenticated.
    func cloudCoach() -> CloudCoach? {
        guard isUnlocked, let token = api.token else { return nil }
        return CloudCoach(token: token)
    }

    /// The owner-only device vault. nil unless unlocked.
    func vault() -> VaultStore? {
        guard let key = session.contentKey else { return nil }
        return VaultStore(contentKey: key, space: coachSpace)
    }

    /// Show the Vault tab only for the owner space (gate preserved from web).
    var showVault: Bool { coachSpace == VaultStore.ownerSpace }

    // MARK: - Auth flows

    /// First setup of a new e2e account on this device.
    func claim(username: String, password: String) async {
        await run {
            let prep = try SanctuaryUnlock.prepareClaim(space: username, password: password)
            let jwt = try await self.api.claim(
                username: username, kdfSaltB64: prep.saltB64, authVerifierB64: prep.verifierB64
            )
            self.api.token = jwt
            self.username = username
            self.session.unlock(space: username, contentKey: prep.keys.contentKey)
        }
    }

    /// Password unlock (derives via Argon2). Fetches the salt from the server on
    /// a fresh install if it isn't cached on-device.
    func loginWithPassword(username: String, password: String) async {
        await run {
            let salt: [UInt8]
            if let cached = SanctuaryUnlock.cachedSalt(space: username) {
                salt = cached
            } else {
                guard let saltB64 = try await self.api.fetchSalt(username: username),
                      let fetched = SanctuaryCrypto.unb64(saltB64) else {
                    throw SanctuaryAPI.APIError.http(404, "No such e2e account.")
                }
                salt = fetched
            }
            let keys = try SanctuaryUnlock.unlockWithPassword(space: username, password: password, salt: salt)
            let jwt = try await self.api.login(username: username, authSecretB64: SanctuaryCrypto.b64(keys.authSecret))
            self.api.token = jwt
            self.username = username
            self.session.unlock(space: username, contentKey: keys.contentKey)
        }
    }

    /// Biometric unlock — Secure-Enclave unwrap, then a silent re-login. No
    /// Argon2, no password.
    func unlockWithBiometrics(username: String) async {
        await run {
            let keys = try SanctuaryUnlock.unlockWithBiometrics(
                space: username, reason: "Unlock your sanctuary"
            )
            let jwt = try await self.api.login(username: username, authSecretB64: SanctuaryCrypto.b64(keys.authSecret))
            self.api.token = jwt
            self.username = username
            self.session.unlock(space: username, contentKey: keys.contentKey)
        }
    }

    /// Lock (keep the device able to biometric-unlock the same account).
    func lock() {
        session.lock()
        api.token = nil
    }

    /// Forget this account on this device entirely (clears the Secure-Enclave key
    /// + cached salt). Re-claim or password unlock will be required next time.
    func signOut() {
        if let username { KeyStore.clear(for: username) }
        api.token = nil
        session.signOut()
        username = nil
    }

    // MARK: - helper

    private func run(_ work: @escaping () async throws -> Void) async {
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }
        do { try await work() }
        catch let e as SanctuaryUnlock.UnlockError {
            errorMessage = friendly(e)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Something went wrong."
        }
    }

    private func friendly(_ e: SanctuaryUnlock.UnlockError) -> String {
        switch e {
        case .weakPassword:
            return "Choose a longer password (at least \(AppConfig.minPasswordLength) characters) or a passphrase of 3+ words."
        case .noBiometricKey:
            return "No saved key on this device — sign in with your password."
        case .corruptWrappedBlob:
            return "Couldn't unlock with Face ID — sign in with your password."
        }
    }
}
