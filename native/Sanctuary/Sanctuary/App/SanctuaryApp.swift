import SwiftUI

/// Native Sanctuary — app entry point.
///
/// The full UI (door → Planner / Coach / Projects) is wired in `UI/RootView.swift`
/// (Step 10) over the shared `AppState` (Step 9). This @main owns that state and
/// hands the scene to RootView. Until RootView lands, the placeholder below keeps
/// the entry coherent.
@main
struct SanctuaryApp: App {
    @StateObject private var state = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(state)
        }
    }
}
