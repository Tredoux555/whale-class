# Sanctuary — Native App Marathon (truly private coach)

**Goal:** the version where her journal can be read by **no one but her** — not the
operator, not a subpoena, not me — and, in its strongest form, where *nothing she writes
or says to the coach ever leaves her phone.* This is the native-app track. The web app
(already shipped, login-separated) is the everyday version; this is the "100%" version.

## The honest ceiling (what even this cannot do)
- **Her unlocked device defeats everything.** If someone has her phone unlocked, they can
  read it. We mitigate with biometric/passcode-gated keys, auto-lock, and no plaintext at
  rest — but device-in-hand beats all crypto. This is true of Signal too.
- **Metadata leaks.** That she logs in, when, that entries exist, payload sizes. Crypto
  hides content, never the fact of it.
- **A cloud AI coach sees the live turn.** The only way the coach sees *nothing* is an
  on-device model (the fork below). Everything else is honest, not absolute — and that's
  the truthful maximum, which is far stronger than what she has anywhere else.

---

## THE FORK (decide this first — it shapes the whole build)
**DECIDED (Tredoux, Jun 17 2026): Option 3 — HYBRID.** On-device model is the
default (fully private journaling/reflection, nothing leaves the phone); a clearly
labelled, per-message "ask the deeper coach" sends that single turn to Sonnet on her
explicit tap. Stack therefore leans **Swift** (first-class access to Apple's on-device
Foundation Models + Secure Enclave). Journal is always device-encrypted at rest.

1. **Cloud coach (Sonnet).** Smartest. Journal encrypted at rest with a device-only key
   (nobody can read it, ever). Live coach turn is sent to the AI transiently to reply,
   then dropped (no readable storage, no logging). Backend only ever holds ciphertext.
2. **On-device coach.** Apple Foundation Models (on-device LLM, iPhone 15 Pro / A17+ /
   M-series, iOS 18.1+) **or** a bundled small model (MLX/llama.cpp). *Nothing leaves the
   phone.* True 100%. Trade: a smaller, less nuanced coach; needs a recent device.
3. **Hybrid (recommended).** On-device model is the default — fully private journaling +
   reflection. A clearly-labelled, per-message "ask the deeper coach" opt-in sends *that
   one* turn to the cloud when she chooses. Best of both, with consent at the moment.

---

## Architecture (native)

### Identity + key (zero-knowledge)
- Her password derives a master key **on the device** via Argon2id (libsodium) / HKDF.
  The key lives in the **iOS Keychain / Secure Enclave**, biometric- or passcode-gated,
  and **never leaves the phone**.
- Login uses a password-derived **verifier** (SRP-style or an Argon2 verifier) so the
  server authenticates her **without ever receiving the password or the content key**.
- Lost password = unrecoverable content, by design (offer an optional recovery phrase she
  writes down — her choice).

### Content (server is a dumb ciphertext store)
- Journal entries, coach memory, projects, plans encrypted on-device (CryptoKit
  AES-GCM / libsodium `secretbox`) before they ever touch the network.
- The **existing backend is reused unchanged in spirit** — the `/api/story/*` routes
  become opaque-blob storage: they store and return ciphertext they cannot read. No
  server-side decrypt, no diary-crypto key, no AI reading the diary server-side.
- This is the same model `docs/STORY_E2E_MARATHON_PLAN.md` describes for messages/vault —
  reused for the journal/coach surface.

### The coach
- **On-device path:** the device assembles context (decrypts memory/recent entries
  locally) and runs the local model. Zero network for a coach turn.
- **Cloud path (if chosen / hybrid opt-in):** device assembles context locally, sends
  *that turn only* to the existing Sonnet coach endpoint, streams the reply, persists
  nothing readable. Any memory the coach saves is re-encrypted on-device first.

### Vault (Tredoux only — stays that way)
- The vault is already owner-gated server-side (just hardened). In native, it gets the
  same device-key E2E so even the operator can't read it. Still `space='tredoux'` only.

---

## Tech stack options
- **Swift / SwiftUI (recommended for the 100% path).** Native Keychain/Secure Enclave +
  CryptoKit + **direct access to Apple's on-device Foundation Models** = the cleanest
  road to on-device AI and the strongest key storage. Most work, best result.
- **Expo / React Native.** Reuses the existing React UI patterns; `expo-secure-store` +
  `expo-crypto` / libsodium; on-device AI is harder (bridge to a local model). Faster to
  stand up, weaker on the on-device-AI fork.
- **Flutter.** Fits your ecosystem (guardian-connect is Flutter); `flutter_secure_storage`
  + a Dart/FFI crypto lib; on-device AI via platform channels. Middle ground.

Recommendation: **Swift** if the on-device coach matters (it's the only first-class path to
Apple's local model); **Expo** if cloud-coach + encrypted-journal is enough and speed wins.

---

## Phases (real timeline — weeks, not days)
- **P0 — Decisions + Apple Developer account (gating).** Lock the fork + stack. Finish the
  Apple Developer enrolment (currently ~80%, blocked on the Apple Developer iPhone app +
  passport + $99). Nothing ships to a device without it.
- **P1 — Crypto core (reusable NOW, web or native).** `e2e` lib: Argon2id KDF, encrypt/
  decrypt, key lifecycle, password verifier. Unit-tested against known-answer vectors.
  Can be built today and reused by both web and native.
- **P2 — Backend → ciphertext store.** Adapt the `/api/story/*` journal/coach/projects
  routes to store/return opaque blobs (no server decrypt) for an `e2e` space. Additive;
  existing spaces untouched.
- **P3 — Native shell + login + Keychain key.** The app, the door, Secure-Enclave key,
  zero-knowledge auth.
- **P4 — Journal E2E on device.** Encrypted read/write of entries. Server-blind at rest.
- **P5 — Coach.** On-device model integration (and/or cloud opt-in per the fork).
- **P6 — Vault E2E + metadata minimization + App Store submission** (privacy labels,
  review notes; you've got a submission pack started in `~/Desktop/Montree App Store Pack/`).

---

## What I can start NOW (no native app needed yet)
- **P1 crypto core** — build + test the encryption library this week; it's the foundation
  both tracks share.
- **P2 ciphertext-store API** — make a parallel set of `e2e` journal endpoints that only
  ever see ciphertext, so the data model is ready before the app exists.
- Neither risks the live sanctuaries (additive, `e2e`-space-scoped).

## Honest recommendation
Do **P1 + P2 now** (real, reusable, low-risk). Pick the fork. Finish the Apple Developer
account. Then P3–P6 as a focused native build. Describe it accurately until P6 ships:
*"encrypted with your password; we can't read your journal"* — and only claim the full
"nothing leaves your phone" once the on-device path is live.
