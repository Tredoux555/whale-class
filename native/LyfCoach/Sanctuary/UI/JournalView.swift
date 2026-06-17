import SwiftUI

/// The journal — encrypted diary entries. Reached from the Coach (talking to the
/// Coach IS journaling; this is the written-by-hand side).
struct JournalView: View {
    @EnvironmentObject var state: AppState
    @State private var entries: [DiaryEntry] = []
    @State private var loading = true
    @State private var showAdd = false
    @State private var error: String?

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            if loading {
                ProgressView().tint(Theme.accent)
            } else if entries.isEmpty {
                EmptyHint(icon: "book.closed", text: "Your journal is empty.")
            } else {
                List {
                    ForEach(entries.sorted { ($0.payload.date) > ($1.payload.date) }) { e in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(e.payload.title?.isEmpty == false ? e.payload.title! : e.payload.date)
                                    .foregroundStyle(Theme.text).bold()
                                Spacer()
                                if let m = e.payload.mood, !m.isEmpty {
                                    Text(m).font(.caption2).foregroundStyle(Theme.gold)
                                }
                            }
                            Text(e.payload.body).font(.caption).foregroundStyle(Theme.subtle).lineLimit(3)
                            Text(e.payload.date).font(.caption2).foregroundStyle(Theme.subtle)
                        }
                        .listRowBackground(Theme.field)
                    }
                    .onDelete(perform: deleteRows)
                }
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle("Journal")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showAdd = true } label: { Image(systemName: "square.and.pencil") }
            }
        }
        .sheet(isPresented: $showAdd) { AddEntrySheet(onSave: add) }
        .task { await load() }
        .refreshable { await load() }
        .overlay(alignment: .bottom) { ErrorBar(error) }
    }

    private func load() async {
        guard let repo = state.repository() else { return }
        loading = true; defer { loading = false }
        do { entries = try await repo.loadDiary() } catch { self.error = friendly(error) }
    }
    private func add(_ p: DiaryPayload) async {
        guard let repo = state.repository() else { return }
        do { let e = try await repo.addDiary(p); entries.insert(e, at: 0) } catch { self.error = friendly(error) }
    }
    private func deleteRows(_ offsets: IndexSet) {
        let sorted = entries.sorted { $0.payload.date > $1.payload.date }
        let targets = offsets.map { sorted[$0] }
        Task {
            guard let repo = state.repository() else { return }
            for t in targets {
                do { try await repo.deleteDiary(id: t.id); entries.removeAll { $0.id == t.id } }
                catch { self.error = friendly(error) }
            }
        }
    }
}

private struct AddEntrySheet: View {
    @Environment(\.dismiss) var dismiss
    let onSave: (DiaryPayload) async -> Void
    @State private var title = ""
    @State private var body_ = ""
    @State private var mood = ""
    @State private var date = ISO8601DateFormatter.dateOnly.string(from: Date())

    var body: some View {
        NavigationStack {
            Form {
                TextField("Title (optional)", text: $title)
                TextField("Mood (optional)", text: $mood)
                TextField("Date (YYYY-MM-DD)", text: $date).autocorrectionDisabled()
                Section("Entry") {
                    TextField("Write…", text: $body_, axis: .vertical).lineLimit(6...)
                }
            }
            .navigationTitle("New entry")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let p = DiaryPayload(title: title.isEmpty ? nil : title, body: body_,
                                             mood: mood.isEmpty ? nil : mood, date: date)
                        Task { await onSave(p); dismiss() }
                    }.disabled(body_.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}
