import SwiftUI

/// The Vault — owner-only (space == tredoux). Device-key E2E text secrets that
/// never leave the phone. The tab is only added for the owner (see MainTabView);
/// `VaultStore` refuses any other space as a second gate.
struct VaultView: View {
    @EnvironmentObject var state: AppState
    @State private var secrets: [VaultSecret] = []
    @State private var showAdd = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                if secrets.isEmpty {
                    EmptyHint(icon: "lock.shield", text: "Your vault is empty.")
                } else {
                    List {
                        ForEach(secrets) { s in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(s.title).foregroundStyle(Theme.text).bold()
                                Text(s.body).font(.caption).foregroundStyle(Theme.subtle)
                            }
                            .listRowBackground(Theme.field)
                        }
                        .onDelete(perform: delete)
                    }
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Vault")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { LockButton() }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showAdd = true } label: { Image(systemName: "plus") }
                }
            }
            .sheet(isPresented: $showAdd) { AddSecretSheet(onSave: add) }
            .onAppear(perform: reload)
        }
    }

    private func reload() {
        secrets = state.vault()?.load() ?? []
    }
    private func add(_ title: String, _ body: String) {
        guard let v = state.vault() else { return }
        secrets.insert(VaultSecret(title: title, body: body), at: 0)
        v.save(secrets)
    }
    private func delete(_ offsets: IndexSet) {
        secrets.remove(atOffsets: offsets)
        state.vault()?.save(secrets)
    }
}

private struct AddSecretSheet: View {
    @Environment(\.dismiss) var dismiss
    let onSave: (String, String) -> Void
    @State private var title = ""
    @State private var body_ = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("Label", text: $title)
                Section("Secret") {
                    TextField("…", text: $body_, axis: .vertical).lineLimit(4...)
                }
            }
            .navigationTitle("New secret")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { onSave(title, body_); dismiss() }
                        .disabled(title.isEmpty || body_.isEmpty)
                }
            }
        }
    }
}
