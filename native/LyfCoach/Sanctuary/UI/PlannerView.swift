import SwiftUI

/// Planner — encrypted calendar events. Tap a day's list to add; swipe to delete.
struct PlannerView: View {
    @EnvironmentObject var state: AppState
    @State private var events: [EventItem] = []
    @State private var loading = true
    @State private var showAdd = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                if loading {
                    ProgressView().tint(Theme.accent)
                } else if events.isEmpty {
                    EmptyHint(icon: "calendar", text: "Nothing planned yet.")
                } else {
                    List {
                        ForEach(events.sorted { ($0.payload.date, $0.payload.time ?? "") < ($1.payload.date, $1.payload.time ?? "") }) { e in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(e.payload.title).foregroundStyle(Theme.text).bold()
                                Text("\(e.payload.date)\(e.payload.time.map { " · \($0)" } ?? "")")
                                    .font(.caption).foregroundStyle(Theme.subtle)
                                if let n = e.payload.notes, !n.isEmpty {
                                    Text(n).font(.caption).foregroundStyle(Theme.subtle)
                                }
                            }
                            .listRowBackground(Theme.field)
                        }
                        .onDelete(perform: deleteRows)
                    }
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Planner")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showAdd = true } label: { Image(systemName: "plus") }
                }
                ToolbarItem(placement: .topBarLeading) { LockButton() }
            }
            .sheet(isPresented: $showAdd) { AddEventSheet(onSave: add) }
            .task { await load() }
            .refreshable { await load() }
            .overlay(alignment: .bottom) { ErrorBar(error) }
        }
    }

    private func load() async {
        guard let repo = state.repository() else { return }
        loading = true; defer { loading = false }
        do { events = try await repo.loadEvents() } catch { self.error = friendly(error) }
    }
    private func add(_ p: EventPayload) async {
        guard let repo = state.repository() else { return }
        do { let e = try await repo.addEvent(p); events.append(e) } catch { self.error = friendly(error) }
    }
    private func deleteRows(_ offsets: IndexSet) {
        let sorted = events.sorted { ($0.payload.date, $0.payload.time ?? "") < ($1.payload.date, $1.payload.time ?? "") }
        let targets = offsets.map { sorted[$0] }
        Task {
            guard let repo = state.repository() else { return }
            for t in targets {
                do { try await repo.deleteEvent(id: t.id); events.removeAll { $0.id == t.id } }
                catch { self.error = friendly(error) }
            }
        }
    }
}

private struct AddEventSheet: View {
    @Environment(\.dismiss) var dismiss
    let onSave: (EventPayload) async -> Void
    @State private var date = Self.today
    @State private var time = ""
    @State private var title = ""
    @State private var notes = ""

    static var today: String { ISO8601DateFormatter.dateOnly.string(from: Date()) }

    var body: some View {
        NavigationStack {
            Form {
                TextField("Title", text: $title)
                TextField("Date (YYYY-MM-DD)", text: $date).autocorrectionDisabled()
                TextField("Time (HH:MM, optional)", text: $time).autocorrectionDisabled()
                TextField("Notes (optional)", text: $notes, axis: .vertical)
            }
            .navigationTitle("New event")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let p = EventPayload(date: date, time: time.isEmpty ? nil : time,
                                             title: title, notes: notes.isEmpty ? nil : notes)
                        Task { await onSave(p); dismiss() }
                    }.disabled(title.isEmpty || date.isEmpty)
                }
            }
        }
    }
}
