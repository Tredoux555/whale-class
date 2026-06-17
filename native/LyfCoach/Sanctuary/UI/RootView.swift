import SwiftUI

/// Top-level switch: the door until unlocked, then the three-tab sanctuary.
struct RootView: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        Group {
            if state.isUnlocked {
                MainTabView()
            } else {
                DoorView()
            }
        }
        .tint(Theme.accent)
        .preferredColorScheme(.dark)
    }
}

/// Planner · Coach · Projects — the same three rooms as the web sanctuary.
struct MainTabView: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        TabView {
            PlannerView()
                .tabItem { Label("Planner", systemImage: "calendar") }
            CoachView()
                .tabItem { Label("Coach", systemImage: "bubble.left.and.text.bubble.right") }
            ProjectsView()
                .tabItem { Label("Projects", systemImage: "target") }
            // Vault is owner-only (space == tredoux); gate preserved from the web.
            if state.showVault {
                VaultView()
                    .tabItem { Label("Vault", systemImage: "lock.shield") }
            }
        }
        .background(Theme.bg.ignoresSafeArea())
        // Defer auto-lock on any interaction within the app.
        .onTapGesture { state.session.touch() }
    }
}

/// The door — a calm, neutral entry. No "story" wording anywhere.
struct DoorView: View {
    @EnvironmentObject var state: AppState

    @State private var name = ""
    @State private var password = ""
    @State private var mode: Mode = .signIn

    enum Mode { case signIn, setUp }

    private var canBiometric: Bool {
        !name.isEmpty && state.canUseBiometrics(for: name)
    }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            VStack(spacing: 22) {
                Spacer()
                Image(systemName: "leaf.fill")
                    .font(.system(size: 44))
                    .foregroundStyle(Theme.accent)
                Text("Lyf Coach")
                    .font(.system(.largeTitle, design: .serif)).bold()
                    .foregroundStyle(Theme.text)
                Text("A quiet place that only opens for you.")
                    .font(.subheadline).foregroundStyle(Theme.subtle)

                VStack(spacing: 12) {
                    TextField("Your name", text: $name)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textContentType(.username)
                        .padding(14).background(Theme.field).clipShape(RoundedRectangle(cornerRadius: 12))

                    SecureField(mode == .setUp ? "Choose a strong password" : "Password", text: $password)
                        .textContentType(mode == .setUp ? .newPassword : .password)
                        .padding(14).background(Theme.field).clipShape(RoundedRectangle(cornerRadius: 12))

                    if mode == .setUp {
                        Text("At least \(AppConfig.minPasswordLength) characters, or a passphrase of 3+ words. This is the only key to your journal.")
                            .font(.caption).foregroundStyle(Theme.subtle)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                if let error = state.errorMessage {
                    Text(error).font(.caption).foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button {
                    Task { await primaryAction() }
                } label: {
                    HStack {
                        if state.isBusy { ProgressView().tint(.black) }
                        Text(mode == .setUp ? "Create my sanctuary" : "Unlock")
                            .bold()
                    }
                    .frame(maxWidth: .infinity).padding(14)
                    .background(Theme.accent).foregroundStyle(.black)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(state.isBusy || name.isEmpty || password.isEmpty)

                if canBiometric {
                    Button {
                        Task { await state.unlockWithBiometrics(username: name) }
                    } label: {
                        Label("Unlock with Face ID", systemImage: "faceid")
                            .frame(maxWidth: .infinity).padding(12)
                    }
                    .foregroundStyle(Theme.accent)
                }

                Button(mode == .setUp ? "I already have a sanctuary" : "Set up a new sanctuary") {
                    mode = (mode == .setUp) ? .signIn : .setUp
                    state.errorMessage = nil
                }
                .font(.footnote).foregroundStyle(Theme.subtle)

                Spacer()
                Text("Encrypted on this device. Even we can't read your journal — but an unlocked phone can, so keep it locked.")
                    .font(.caption2).foregroundStyle(Theme.subtle)
                    .multilineTextAlignment(.center)
            }
            .padding(24)
        }
    }

    private func primaryAction() async {
        switch mode {
        case .setUp:  await state.claim(username: name, password: password)
        case .signIn: await state.loginWithPassword(username: name, password: password)
        }
    }
}

/// Neutral palette — calm dark forest, no brand/"story" references.
enum Theme {
    static let bg = Color(red: 0.04, green: 0.10, blue: 0.06)
    static let field = Color.white.opacity(0.08)
    static let accent = Color(red: 0.20, green: 0.83, blue: 0.60)   // emerald
    static let gold = Color(red: 0.91, green: 0.79, blue: 0.42)
    static let text = Color.white.opacity(0.95)
    static let subtle = Color.white.opacity(0.55)
}
