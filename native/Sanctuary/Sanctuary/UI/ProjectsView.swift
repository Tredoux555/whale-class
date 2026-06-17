import SwiftUI

/// Projects & ambitions — encrypted. Add via the + button; swipe to delete.
struct ProjectsView: View {
    @EnvironmentObject var state: AppState
    @State private var projects: [ProjectItem] = []
    @State private var loading = true
    @State private var showAdd = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                if loading {
                    ProgressView().tint(Theme.accent)
                } else if projects.isEmpty {
                    EmptyHint(icon: "target", text: "No projects yet.")
                } else {
                    List {
                        ForEach(projects) { p in
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(p.payload.title).foregroundStyle(Theme.text).bold()
                                    Spacer()
                                    Text(p.payload.status).font(.caption2)
                                        .padding(.horizontal, 8).padding(.vertical, 2)
                                        .background(Theme.accent.opacity(0.18))
                                        .foregroundStyle(Theme.accent)
                                        .clipShape(Capsule())
                                }
                                if let w = p.payload.why, !w.isEmpty {
                                    Text(w).font(.caption).foregroundStyle(Theme.subtle)
                                }
                                if let n = p.payload.nextAction, !n.isEmpty {
                                    Text("Next: \(n)").font(.caption).foregroundStyle(Theme.gold)
                                }
                            }
                            .listRowBackground(Theme.field)
                        }
                        .onDelete(perform: deleteRows)
                    }
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Projects")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showAdd = true } label: { Image(systemName: "plus") }
                }
                ToolbarItem(placement: .topBarLeading) { LockButton() }
            }
            .sheet(isPresented: $showAdd) { AddProjectSheet(onSave: add) }
            .task { await load() }
            .refreshable { await load() }
            .overlay(alignment: .bottom) { ErrorBar(error) }
        }
    }

    private func load() async {
        guard let repo = state.repository() else { return }
        loading = true; defer { loading = false }
        do { projects = try await repo.loadProjects() } catch { self.error = friendly(error) }
    }
    private func add(_ p: ProjectPayload) async {
        guard let repo = state.repository() else { return }
        do { let item = try await repo.addProject(p); projects.insert(item, at: 0) } catch { self.error = friendly(error) }
    }
    private func deleteRows(_ offsets: IndexSet) {
        let targets = offsets.map { projects[$0] }
        Task {
            guard let repo = state.repository() else { return }
            for t in targets {
                do { try await repo.deleteProject(id: t.id); projects.removeAll { $0.id == t.id } }
                catch { self.error = friendly(error) }
            }
        }
    }
}

private struct AddProjectSheet: View {
    @Environment(\.dismiss) var dismiss
    let onSave: (ProjectPayload) async -> Void
    @State private var title = ""
    @State private var why = ""
    @State private var next = ""
    @State private var status = "active"

    private let statuses = ["active", "paused", "done", "dropped"]

    var body: some View {
        NavigationStack {
            Form {
                TextField("Title", text: $title)
                TextField("Why it matters (optional)", text: $why, axis: .vertical)
                TextField("Next action (optional)", text: $next)
                Picker("Status", selection: $status) {
                    ForEach(statuses, id: \.self) { Text($0.capitalized) }
                }
            }
            .navigationTitle("New project")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let p = ProjectPayload(title: title, why: why.isEmpty ? nil : why,
                                               nextAction: next.isEmpty ? nil : next, status: status, priority: nil)
                        Task { await onSave(p); dismiss() }
                    }.disabled(title.isEmpty)
                }
            }
        }
    }
}
