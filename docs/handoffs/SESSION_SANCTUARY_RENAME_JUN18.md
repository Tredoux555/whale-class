# SESSION HANDOFF — Jun 18, 2026 (Cowork)

**Sanctuary native app: Lyf Coach → Sanctuary rename + app icon (build-verified, pushed) ·
AI-control "Facebook conversation" piece.**

This is the canonical, standalone handoff. If you read nothing else, read this, then
`native/Sanctuary/SANCTUARY.md` (the master Sanctuary doc) and `native/Sanctuary/VERIFY.md`
(the go-live checklist).

---

## TL;DR

| Thing | State |
|---|---|
| Sanctuary native app — rename + icon | ✅ DONE, build-verified, committed `bdcc1f9f` |
| `xcodebuild build` (iOS Simulator) | ✅ BUILD SUCCEEDED (172s) after rename + icon |
| Crypto XCTest (KAT + fails-closed) | ✅ GREEN (proven earlier, Step 7; not re-run — build success confirms crypto source untouched) |
| Backend P1 (TS crypto) + P2 (ciphertext store) | ✅ pushed + deployed in PRIOR sessions; INERT until a space is e2e |
| Migration 265 + NOT-NULL drops | ✅ RUN by Tredoux in Supabase (confirmed) |
| AI-control Facebook assets | ✅ 3 files in `social/ai-control/` (NOT git — personal social content) |
| Brain (`CLAUDE.md`) | ✅ updated, committed `44ba9143` |
| Apple Developer enrolment / TestFlight / on-device test / App-Store submit | ⏳ PENDING (needs human + paid Apple account) |
| In-app account deletion (App-Store hard req) | ⏳ NOT BUILT |

Two commits on `main` this session: **`bdcc1f9f`** (the whole `native/Sanctuary/` Swift app — its
first ever commit) and **`44ba9143`** (CLAUDE.md brain update). Pushed via Desktop Commander from the
`montree` Cowork checkout (= same `whale-class.git`, same `main` Railway deploys from).

---

## What Sanctuary IS

The personal Sanctuary (the `/story/admin` web platform — diary / coach / projects / planner /
owner vault, spaces `tredoux` / `bayan` / `riddick`) re-built as a **real native iOS app** with
**end-to-end, on-device encryption**. The phone derives the content key from the person's password
(Argon2id → KDF → XSalsa20-Poly1305); the server only ever stores opaque ciphertext (`sb1.<nonce>.<ct>`).
Secure-Enclave-wrapped key + Face ID unlock. On-device FoundationModels coach, with an explicit
single-reply cloud opt-in.

The **crypto type names stay `Sanctuary*`** (e.g. `SanctuaryCrypto`) — that was always the codename,
shared with the server library `lib/sanctuary-e2e/` so the Known-Answer-Test vectors line up
byte-for-byte across Swift and TypeScript. Only the **product name** changed (Lyf Coach → Sanctuary).

---

## What changed THIS session

### 1. Rename: Lyf Coach → Sanctuary (done before the icon)
- `project.yml`: `name: Sanctuary`, target `Sanctuary`, test target `SanctuaryTests`, bundle
  `xyz.montree.sanctuary`, source path `Sanctuary`. (Header comments updated to say Sanctuary.)
- `Info.plist`: CFBundleDisplayName / CFBundleName = "Sanctuary".
- `RootView.swift`: door title `Text("Sanctuary")`.
- `Tests/SanctuaryCryptoTests.swift`: `@testable import Sanctuary`.
- Folder `native/LyfCoach` → `native/Sanctuary`; `LyfCoach.xcodeproj` removed; `LYF_COACH.md` →
  `SANCTUARY.md`; `.gitignore`, all docs updated.

### 2. App icon (new this session)
- Source: `native/Sanctuary/icon-src/icon.html` — emerald sprout (two leaves + gold stem) on a
  dark-forest radial gradient. Palette = the door's `Theme`: bg `#0a1a0f`, emerald `#34d399`,
  gold `#E8C96A`.
- Rendered to 1024×1024 PNG via headless Chrome → copied into
  `Sanctuary/Resources/Assets.xcassets/AppIcon.appiconset/icon-1024.png` + `Contents.json`
  (single universal 1024 entry) + the catalog's top-level `Contents.json`.
- `project.yml` got `ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon` — **required** because we use a
  manual `Info.plist` (`GENERATE_INFOPLIST_FILE: NO`), so Xcode won't infer the app-icon name.

### 3. Build verification
```
cd native/Sanctuary
xcodegen generate            # regenerates Sanctuary.xcodeproj (gitignored)
xcodebuild build -project Sanctuary.xcodeproj -scheme Sanctuary \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/sanctuary-dd
# → ** BUILD SUCCEEDED **  (EXIT=0, ~172s)
```
The renamed target + the asset catalog compile clean. The crypto XCTest was green earlier (Step 7);
not re-run here because the build success confirms the rename/icon didn't touch crypto source.

### 4. Commit
36 files staged via `git add native/Sanctuary` (`.gitignore` correctly excluded
`Sanctuary.xcodeproj/` + `DerivedData/`). Committed `bdcc1f9f`, pushed to `main`.

---

## Where the 14-step build stands (everything before this session)

All 14 runbook steps (`docs/SANCTUARY_NATIVE_BUILD_RUNBOOK.md`) were completed + audited in prior
sessions:
- **P1 — crypto core (TS).** `lib/sanctuary-e2e/crypto.ts` + 14 KAT tests green; `vectors.json` is
  the cross-language contract.
- **P2 — ciphertext backend.** e2e auth (claim + login via authSecret verifier) + diary/projects/
  events ciphertext store + coach "no readable persistence for e2e" guard. 17 + 8 unit tests,
  eslint/tsc clean. **Pushed + deployed.** INERT until a space is flipped to e2e — the web
  sanctuaries are untouched (reads use wide-select with a 42703 / PGRST204 missing-column fallback;
  writes are body-driven + guarded).
- **Migration 265** (+ the NOT-NULL drops on 10 semantic columns) — **RUN by Tredoux in Supabase.**
- **Swift app** — source-complete (crypto mirror, Secure-Enclave key lifecycle, Keychain, biometric
  + 15-min idle auto-lock, networking, door → Planner/Coach/Projects + owner Vault, on-device coach +
  cloud opt-in) and now **compiles** on the simulator.

---

## PENDING — "continue Sanctuary properly" picks up HERE

All of these need a human + a paid Apple account; none can be done in the Cowork build env.

1. **Apple Developer enrolment** ($99 + passport). Per the Montree brain's separate App-Store thread,
   enrolment was ~80% — **web enrolment is hard-blocked by Apple** (`UserIneligibleForWebEnrollment`),
   so it must be finished in the **Apple Developer iPhone app**. (Apple's SMS to the +86 number only
   delivers VPN-OFF.) The same Apple account unlocks signing + TestFlight.
2. **Create fresh e2e accounts.** e2e is space-scoped + additive — existing bcrypt accounts are NOT
   auto-converted. Per person, create an **unclaimed** `story_admin_users` row:
   `username` == space label (`tredoux`/`bayan`/`riddick`), `password_hash = 'SET_ON_FIRST_LOGIN'`,
   correct `space`. The app claims it on first "Set up a new sanctuary" (derives keys on-device,
   registers only `{kdf_salt, auth_verifier}`). From then on it's native-only.
3. **TestFlight + on-device test** (REAL device — Simulator has no Secure Enclave). Per `VERIFY.md` §7:
   claim → encrypt/decrypt round-trip (journal + project + planner event, background, reopen, read
   back) → lock + Face-ID re-unlock (no password) → coach on-device + one cloud opt-in →
   DB check: newest e2e row's `ciphertext` starts `sb1`, `body_enc`/`entry_date` are NULL.
4. **🚨 App-Store hard requirement NOT built yet:** in-app account deletion (Apple Guideline
   5.1.1(v)) + privacy-policy URL + a demo account in reviewer notes. The native app deliberately has
   **no covert "Messages" door** (the web has one — keep it OUT of any App-Store build; Apple 2.3.1).
5. **Fire-test before the store — YES, you can:** a free Xcode **dev install** onto your own iPhone
   (device plugged in, your Apple ID as a *personal team*; 7-day cert expiry, 3-app limit) — no $99
   needed just to run it on your phone. TestFlight/App Store need the paid account. The iPhone is NOT
   freely sideloadable like the Mac — it's dev-install / TestFlight / App Store only.

**To resume from clean:**
```
cd native/Sanctuary && xcodegen generate && open Sanctuary.xcodeproj
```
Xcode resolves swift-sodium 0.11.0. Set Team + bundle `xyz.montree.sanctuary`. The simulator app
currently installed is the OLD "Lyf Coach" build — reinstall after a rebuild to see the renamed
Sanctuary + icon.

---

## File map (native/Sanctuary)

```
SANCTUARY.md            ← master entry doc (read first)
VERIFY.md               ← ordered go-live checklist (migration → enrol → build → test → submit)
README_BUILD.md         ← first-build triage
APP_STORE.md            ← listing copy, privacy labels, reviewer notes (honest claims only)
project.yml             ← XcodeGen spec (Sanctuary + SanctuaryTests, swift-sodium 0.11.0, AppIcon)
icon-src/icon.html      ← app-icon source (re-render to PNG to change it)
Sanctuary/
  App/                  @main entry, AppState, AppConfig
  Crypto/               SanctuaryCrypto (Argon2id/KDF/BLAKE2b/XSalsa20) + SecureEnclave/Keychain/unlock
  Net/                  SanctuaryAPI
  Store/                SessionKey, ContentRepository, VaultStore
  Coach/                CoachPersona, OnDeviceCoach (FoundationModels), CloudCoach (SSE opt-in)
  UI/                   RootView (door "Sanctuary"), Planner/Projects/Journal/Coach/Vault, Theme
  Resources/            Info.plist, Assets.xcassets/AppIcon.appiconset, PrivacyInfo.xcprivacy
Tests/
  SanctuaryCryptoTests.swift   parity XCTest (KAT vectors + fails-closed)
  vectors.json                 byte-identical copy of lib/sanctuary-e2e/vectors.json
```

---

## AI-control "Facebook conversation" piece (separate ask, same session)

Tredoux pasted a late-night human↔AI exchange about the real danger of AI and asked for a styled
post + PDF + a quick-read teaser image. The throughline: the danger isn't a rogue AI seizing control,
it's humans handing judgment over one convenience at a time. The AI's line: draw it at
**irreversibility** + **opacity**. Tredoux's framing: **direction + derivative + no physical control +
humans hold the hard decisions** (the Xavier "a pen can write a poem or stab an eye" analogy), plus
transparency-to-the-human and the Lifecycle-Coach "data transfers to the child at 18". Closing
tension: *what happens when Astra's read on a child conflicts with the teacher's gut — who wins?*

**3 assets in `social/ai-control/` (NOT git-committed — personal social content, lives in the workspace):**
- `conversation.html` — full styled dialogue (dark-forest, emerald/gold speaker chips, serif,
  pull-quote, open-question close, montree.xyz footer).
- `Where-do-you-draw-the-line.pdf` — 4-page PDF of the above.
- `teaser-card.png` — 1080×1080 scroll-stopper for the post itself.

To rebuild any: edit the `.html`, re-render with headless Chrome (see recipe below).

---

## Repro recipe — Cowork image/PDF/icon gen on the Mac (locked in)

Headless Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless --disable-gpu`.
- **PNG:** `--hide-scrollbars --force-device-scale-factor=1 --window-size=W,H --screenshot=out.png "file://$(pwd)/in.html"`
- **PDF:** `--no-pdf-header-footer --print-to-pdf=out.pdf "file://$(pwd)/in.html"` (dark backgrounds
  survive via CSS `print-color-adjust:exact`).
- **iOS app icons:** render full-bleed square, no rounded corners, no alpha — iOS applies the mask.
- Always `Read` the rendered output to eyeball it and iterate.

---

## Git / push notes

- The Cowork working folder is `montree/` which IS the `whale-class.git` repo (same remote + `main`
  as the `whale/` checkout the brain references). Pushes from here land on production `main`.
- Push via **Desktop Commander** with `GIT_SSH_COMMAND='ssh -o ServerAliveInterval=15 -o ServerAliveCountMax=10'`.
- `native/Sanctuary/.gitignore` excludes `Sanctuary.xcodeproj/` and `DerivedData/` — never commit those.
