# Sanctuary (native) — Build Guide

> **Status: source-complete, pending compile.** Every Swift file here was written
> and reviewed against the crypto spec (`docs/SANCTUARY_NATIVE_BUILD_RUNBOOK.md`
> §3) but has **not** been compiled, signed, or run — there is no Xcode in the
> build environment. Treat the first Xcode build as a triage pass (see §6).

This is the native, device-encrypted Sanctuary for the family (spaces `tredoux`,
`bayan`, `riddick`). The journal/coach/projects are encrypted with a key derived
on-device from the person's password; the server only ever stores opaque
ciphertext. See `docs/HONEST_CEILING` in the runbook for what this can and cannot
do.

---

## 1. Prerequisites

- **macOS + Xcode 15+** (iOS 17 SDK).
- **XcodeGen**: `brew install xcodegen` (generates the `.xcodeproj` from
  `project.yml` — no fragile hand-written project file).
- An **Apple Developer account** (for signing + TestFlight). Enrolment is the
  one outstanding account task — see `VERIFY.md`.

## 2. Generate the Xcode project

```bash
cd native/Sanctuary
xcodegen generate          # produces Sanctuary.xcodeproj
open Sanctuary.xcodeproj
```

Xcode will resolve the Swift Package dependency **swift-sodium**
(`https://github.com/jedisct1/swift-sodium`) automatically. If it doesn't:
File ▸ Packages ▸ Resolve Package Versions.

> **swift-sodium = the same libsodium** the TypeScript reference + the KAT
> vectors use. That is what makes the parity test (§4) a real cross-language
> proof. Pin: `from: "0.9.1"` in `project.yml` — bump to the latest 0.9.x tag if
> needed and re-run the crypto test.

## 3. Signing

In the **Sanctuary** target ▸ Signing & Capabilities:
- Team: your Apple Developer team.
- Bundle Identifier: `xyz.montree.sanctuary` (or your own).
- Automatically manage signing: on.

## 4. Run the crypto parity test FIRST (the contract)

Before trusting anything, prove the Swift crypto reproduces the reference vectors
byte-for-byte:

- Select the **SanctuaryTests** scheme (or ⌘U).
- It loads `Tests/vectors.json` (a copy of `lib/sanctuary-e2e/vectors.json`) and
  asserts `deriveMaster / deriveContentKey / deriveAuthSecret / authVerifier /
  encrypt` all match. **All green = the device crypto is identical to the server
  contract.** If anything is red, STOP and fix before shipping data.

## 5. Build + run on a device

Encryption uses the Secure Enclave + biometrics, so use a **real device**
(Simulator has no Secure Enclave). Build (⌘R), then:
- First run a space → **set a password** (the e2e *claim*): the device derives
  the keys locally and registers only `{ kdf_salt, auth_verifier }` server-side.
- Lock + unlock with Face ID.
- Add a journal entry / project / planner event → confirm it round-trips (write,
  background the app, reopen, read it back).
- Ask the Coach a normal question (on-device), then tap "ask the deeper coach"
  (cloud opt-in).

## 6. First-build triage (expect a few fixes)

This source has never seen a compiler. Likely first-build items:
- **swift-sodium API names**: the spec→Swift mapping is documented in
  `Sanctuary/Crypto/SanctuaryCrypto.swift`. If a method signature differs in the
  pinned version (e.g. `pwHash.hash` argument labels, `keyDerivation.derive`),
  adjust to match the resolved package and re-run the crypto test.
- **Async/await + `@MainActor`** annotations on view models.
- **Optional unwraps** flagged by the compiler.
Fix, keep the crypto test green, iterate.

## 7. TestFlight

Product ▸ Archive ▸ Distribute App ▸ TestFlight. Add the family as internal
testers. (App Store listing + privacy copy: `docs/` per Step 13.)

---

## Folder layout

```
native/Sanctuary/
  project.yml                 XcodeGen spec (app + test targets, swift-sodium)
  README_BUILD.md             this file
  Sanctuary/
    App/                      @main entry, AppState, config
    Crypto/                   SanctuaryCrypto (mirrors §3) + Keychain/Enclave
    Net/                      SanctuaryAPI (talks to the Step 4/5 backend)
    Coach/                    on-device + cloud-opt-in coach + persona
    Store/                    content stores (diary/projects/events) + vault
    UI/                       door → Planner / Coach / Projects
    Resources/                Info.plist, PrivacyInfo.xcprivacy
  Tests/
    SanctuaryTests.swift   parity XCTest
    vectors.json                 copy of lib/sanctuary-e2e/vectors.json
```
