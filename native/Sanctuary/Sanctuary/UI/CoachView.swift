import SwiftUI

/// The Coach room — talking to the coach IS journaling. The DEFAULT coach runs
/// ON-DEVICE (Apple Foundation model); nothing leaves the phone. "Ask the deeper
/// coach" is an EXPLICIT per-message cloud opt-in (Sonnet) — the only time this
/// turn's text is sent to the server. On devices without on-device AI, a banner
/// discloses that sending uses the secure cloud coach.
struct CoachView: View {
    @EnvironmentObject var state: AppState
    @State private var messages: [CoachMessage] = []
    @State private var input = ""
    @State private var sending = false
    @State private var error: String?
    @State private var conversationId = UUID().uuidString

    private var onDeviceAvailable: Bool { OnDeviceCoach.isAvailable }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                VStack(spacing: 0) {
                    transcript
                    if !onDeviceAvailable { cloudOnlyBanner }
                    composer
                }
            }
            .navigationTitle("Coach")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { LockButton() }
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink { JournalView() } label: { Image(systemName: "book.closed") }
                }
            }
            .overlay(alignment: .bottom) { ErrorBar(error) }
        }
    }

    private var transcript: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 12) {
                    if messages.isEmpty {
                        Text("What's on your mind?")
                            .foregroundStyle(Theme.subtle)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.top, 40)
                    }
                    ForEach(messages) { m in bubble(m).id(m.id) }
                }
                .padding(16)
            }
            .onChange(of: messages.count) { _, _ in
                if let last = messages.last { withAnimation { proxy.scrollTo(last.id, anchor: .bottom) } }
            }
        }
    }

    private func bubble(_ m: CoachMessage) -> some View {
        HStack {
            if m.role == .user { Spacer(minLength: 40) }
            VStack(alignment: .leading, spacing: 4) {
                Text(m.text).foregroundStyle(Theme.text)
                if m.role == .coach && m.viaCloud {
                    Text("deeper coach")
                        .font(.caption2).foregroundStyle(Theme.gold)
                }
            }
            .padding(12)
            .background(m.role == .user ? Theme.accent.opacity(0.20) : Theme.field)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            if m.role == .coach { Spacer(minLength: 40) }
        }
    }

    private var cloudOnlyBanner: some View {
        Text("On-device AI isn't available here, so the coach uses the secure cloud — your message for this turn is sent to the server for the reply (nothing is stored).")
            .font(.caption2).foregroundStyle(Theme.subtle)
            .padding(8).frame(maxWidth: .infinity)
            .background(Theme.field)
    }

    private var composer: some View {
        VStack(spacing: 6) {
            HStack(spacing: 8) {
                TextField("Talk to your coach…", text: $input, axis: .vertical)
                    .lineLimit(1...4)
                    .padding(10).background(Theme.field).clipShape(RoundedRectangle(cornerRadius: 12))
                Button {
                    Task { await send(viaCloud: !onDeviceAvailable) }
                } label: {
                    Image(systemName: "arrow.up.circle.fill").font(.title2)
                }
                .disabled(sending || input.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            // Explicit per-message cloud opt-in (only meaningful when on-device IS available).
            if onDeviceAvailable {
                Button {
                    Task { await send(viaCloud: true) }
                } label: {
                    Label("Ask the deeper coach", systemImage: "cloud.bolt")
                        .font(.caption)
                }
                .foregroundStyle(Theme.gold)
                .disabled(sending || input.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(12)
    }

    private func send(viaCloud: Bool) async {
        let question = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !question.isEmpty, !sending else { return }
        input = ""
        error = nil
        sending = true
        defer { sending = false }

        let history = messages
        messages.append(CoachMessage(role: .user, text: question))

        if viaCloud {
            guard let coach = state.cloudCoach() else { error = "Not signed in."; return }
            var reply = CoachMessage(role: .coach, text: "", viaCloud: true)
            messages.append(reply)
            let index = messages.count - 1
            do {
                try await coach.ask(space: state.coachSpace, history: history, question: question, conversationId: conversationId) { delta in
                    reply.text += delta
                    if messages.indices.contains(index) { messages[index] = reply }
                }
            } catch { self.error = friendly(error); if messages.indices.contains(index), reply.text.isEmpty { messages.remove(at: index) } }
        } else {
            do {
                let answer = try await OnDeviceCoach.respond(space: state.coachSpace, history: history, prompt: question)
                messages.append(CoachMessage(role: .coach, text: answer, viaCloud: false))
            } catch { self.error = friendly(error) }
        }
    }
}
