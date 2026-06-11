# Montree → App Stores: Roadmap

*Drafted 2026-06-06 after inspecting the actual Capacitor setup + toolchain. Honest version: the build is further along than zero, but there are real gates.*

## The core architecture decision (my strong recommendation)

Your native app today is a **remote wrapper**: `capacitor.config.ts` sets `server.url: 'https://montree.xyz'` and bundles only a loading spinner. Two consequences: Apple can reject it under Guideline 4.2 ("just a website"), and it **white-screens with no internet**.

There are two ways forward:

- **A. Harden the wrapper (RECOMMENDED).** Keep loading from montree.xyz, but make it a legitimately native app: real push notifications, camera, a proper offline screen (not white), polished splash/icons, native status bar. This is how most server-rendered apps ship to the stores.
- **B. Static-export the whole app to bundle it locally.** Best 4.2 story + true offline, but your app is a large server-rendered Next.js App Router app (server components, dynamic routes, middleware) — static export was clearly attempted and abandoned (the build script skips it). Re-architecting for export is weeks of work with high risk of a broken app.

**I recommend A.** It's the efficient path for a solo dev and gets you live fastest. B is not worth it for this codebase.

## Reality check: what gates a store launch

These aren't optional — they're how the stores work:

1. **Developer accounts.** Apple $99/yr (waivable — you may qualify as an education/nonprofit; worth applying), Google $25 once. *You* must create these with your legal ID + card.
2. **Kids'-data scrutiny.** This is the big one for Montree. The app handles children's data, which triggers extra review under Apple's Kids guidelines / COPPA-style rules even though the *users* are teachers, not kids. You need a real **privacy policy URL**, accurate **App Privacy "nutrition labels"**, and a clear stance that children don't log in. I can draft the privacy policy + the data-collection disclosures; you publish them.
3. **Store assets.** App icon (have brand colors), screenshots per device size, description, keywords, support URL, age rating. I can generate most of these.
4. **Toolchain (your Mac).** Have: Xcode 26.3. Missing: CocoaPods (iOS), Java + Android SDK (Android), Fastlane (automation). The CLI ones I can install; Android Studio is a GUI install on you.

## Phased plan

**Phase 0 — unblock (mostly you, ~1 evening).** Create Apple + Google accounts (or start the Apple fee-waiver). I install CocoaPods + Fastlane; you install Android Studio + JDK. I draft the privacy policy.

**Phase 1 — make it submission-worthy (me, code).** Offline fallback screen (kills the white-screen), verify/wire push notifications + camera as real native features, status-bar + safe-area polish, app icon + splash from your brand. All on a branch, testable in Xcode simulator.

**Phase 2 — Android first (fast win).** Google Play is lenient on wrappers. Build a signed AAB, fill the listing, submit. Often live in 1–3 days. Proves the whole pipeline cheaply.

**Phase 3 — iOS.** Build/sign in Xcode, App Store Connect listing with the privacy labels, submit. Apple review is days and may bounce once on 4.2 — Phase 1's native features are the insurance. 

**Phase 4 — automate (Fastlane).** One command builds+signs+uploads both. Later, a GitHub Action does it on a release tag. This is the "no team" endgame.

## What I can start right now (no accounts needed)

- Phase 1 code: offline fallback + native-feature wiring + config hardening, on a branch.
- Generate app icons + splash from your brand colors.
- Draft the privacy policy + App Privacy disclosure answers (critical for the kids-data review).
- Install CocoaPods + Fastlane via brew (if you want me to).

## Decisions I need from you

1. Confirm **Path A** (harden the wrapper) — or do you want to discuss B?
2. **Which store first** — Android (faster) or iOS (your bigger audience)?
3. Want me to start **Phase 1 code + privacy policy draft now**, while you handle accounts in parallel?
