# Sanctuary Native Marathon — Overnight Build Runbook (EXECUTE THIS)

> This is the single source of truth for the overnight build. A fresh session is
> refreshed with this file and executes it top to bottom. **Do not re-derive the
> design — it's locked below.** Follow the audit cadence on every step.

---

## 0. THE AUDIT CADENCE (how every step runs — non-negotiable)

For EACH step S:
1. **PRE-AUDIT (think before acting).** Write out, in the session: what this step
   changes, why, what could go wrong, what invariants it must not break, and how you'll
   know it's correct. If the pre-audit surfaces a problem, fix the plan for this step
   BEFORE touching code.
2. **DO.** Implement exactly what the step says. Nothing extra.
3. **POST-AUDIT (verify after acting).** Run the step's verification checklist. Re-read
   the diff. Confirm every invariant in §3 still holds. For backend steps, confirm the
   existing web sanctuaries still work.
4. **CLEAN-GATE.** Only when the post-audit is fully clean do you commit + push (where
   applicable) and move on. If not clean, fix and re-audit. Do not advance on a dirty audit.
5. **Re-audit the NEXT step's thinking before starting it** (back to 1).

Commit after each clean step (Desktop Commander push). Keep commits scoped per step.

---

## 1. MISSION & HONEST CEILING

Build the **native, device-encrypted Sanctuary** for the family (spaces: `tredoux`,
`bayan`, `riddick`). Journal/coach/projects encrypted with a key that lives only on the
person's device. Hybrid coach: on-device model by default, per-message cloud opt-in.

**What even this cannot do (state it in the app, honestly):** an unlocked/seized device
defeats all crypto; metadata (that she logs in, when, that entries exist) is never hidden;
a fully-compromised server enables an offline dictionary attack on a *weak* password.
Mitigations: Argon2id (slow), strong-password requirement, Secure Enclave key wrapping,
on-device AI for the live turn.

**What the overnight session CAN finish for real (in this repo):** P1 crypto core + P2
ciphertext backend — tested, deployable. **What it can only WRITE, not verify:** the Swift
app source (no Xcode/compile/sign/device/App-Store here). Mark all Swift as
"source-complete, pending Tredoux compile." NEVER claim a running native app.

---

## 2. LOCKED DECISIONS (do not re-open)

- **Hybrid coach.** On-device model default; per-message "ask the deeper coach" → cloud
  Sonnet on explicit tap. Journal always device-encrypted at rest.
- **Stack: Swift / SwiftUI.** Reason: first-class Apple on-device model + Secure Enclave.
- **Crypto lib: libsodium both sides.** TS reference = `libsodium-wrappers`; Swift =
  `swift-sodium`. Proven identical via shared known-answer vectors. NO hand-rolled crypto,
  NO CryptoKit for the shared format (parity risk).
- **An `e2e` space is native-app-only.** Different auth + crypto from the legacy web
  sanctuary. When a space becomes `e2e`, its web door is disabled for that space. The
  existing (non-e2e) web sanctuaries are untouched.
- **Vault stays `space='tredoux'` only** (already hardened server-side; native gets device-key E2E too).
- **e2e is additive + space-scoped.** Existing spaces/data never altered or migrated
  without an explicit, user-triggered, audited migration step.

---

## 3. CRYPTO SPEC (implement exactly; both impls must match these vectors)

**Inputs:** password `P` (string), per-user salt `S` = 16 random bytes (stored server-side, not secret).

**Key hierarchy (libsodium):**
- `master` = `crypto_pwhash(P, S, ALG=ARGON2ID13, OPS=3, MEM=128*1024*1024)` → 32 bytes.
- `contentKey` = `crypto_kdf_derive_from_key(subkey_id=1, ctx="sanctctn", master)` → 32 bytes.
- `authSecret` = `crypto_kdf_derive_from_key(subkey_id=2, ctx="sanctaut", master)` → 32 bytes.

**Auth (server never sees `P` or `contentKey`):**
- Server stores: `kdf_salt = S`, `auth_verifier = crypto_generichash(authSecret)` (32-byte BLAKE2b).
- **Claim (first setup):** client derives locally, sends `{ username, kdf_salt, auth_verifier }`.
- **Login:** client sends `authSecret` over TLS; server checks
  `crypto_generichash(authSecret) == auth_verifier`; issues the existing story-admin JWT
  (role=admin, space). DB only ever stores the verifier (hash), never `authSecret`.
- Honest residual (document in code + app): a server that captures `authSecret` at login
  can mount an offline dictionary attack on `P`. Argon2id + strong-password gate is the mitigation.

**Content encryption (every journal/coach/project record):**
- `nonce` = 24 random bytes. `ct` = `crypto_secretbox_easy(plaintext, nonce, contentKey)`.
- **Wire format:** `sb1.<base64(nonce)>.<base64(ct)>` (ct includes the Poly1305 tag).
- Decrypt = reverse; on failure return a visible sentinel, never raw bytes.

**Metadata that stays plaintext (the honest minimum):** row `id`, `space`, `created_at`
(server insert time — unavoidable). EVERYTHING semantic (title, body, mood, dates she
writes, coach text) lives INSIDE the ciphertext. The client decrypts all rows to render
the planner/calendar (personal scale; zero semantic leak).

**Secure Enclave (native):** after first successful unlock, wrap `contentKey` with a
Secure-Enclave key (biometric/passcode-gated); subsequent unlocks return `contentKey`
without re-running Argon2 or needing `P`. Wipe on lock/logout.

**Strong-password gate:** minimum 10 chars OR a passphrase; warn on weak. (The residual above is why.)

---

## 4. DATA-SAFETY INVARIANTS (check in EVERY post-audit)

1. Existing non-e2e login still works (Tredoux/Bayan/Riddick web sanctuaries unbroken).
2. Existing diary/coach/projects rows for non-e2e spaces are never read-broken or rewritten.
3. No server-side code ever decrypts an `e2e` row. Grep for it in post-audit.
4. Vault remains `space='tredoux'`-only on every route.
5. Every new endpoint is space-scoped from the JWT, never from the body.
6. Migrations are additive + idempotent; the session WRITES them and puts the SQL in chat
   for Tredoux to run — it never auto-runs a migration.
7. Nothing claims a working native app. Swift = "source-complete, pending compile."

---

## 5. THE BUILD — STEP BY STEP (each gated by §0)

### STEP 1 — Ground truth + test harness
- **Pre-audit:** confirm libsodium-wrappers is installable; confirm the exact existing
  `story_admin_users` columns + the diary/coach/projects routes + JWT shape. List every
  assumption.
- **Do:** add `libsodium-wrappers` (+types). Create `lib/sanctuary-e2e/` and a vitest/jest
  harness. No logic yet — just the harness + a libsodium init smoke test.
- **Post-audit:** harness runs green; libsodium initializes; no existing test broke; tsc/lint clean.

### STEP 2 — Crypto core (TS reference) + known-answer vectors
- **Pre-audit:** re-read §3. Confirm param choices (OPS=3, MEM=128MB) are mobile-safe and
  match what swift-sodium can reproduce. Confirm `crypto_kdf` ctx strings are exactly 8 bytes.
- **Do:** implement `deriveMaster`, `deriveContentKey`, `deriveAuthSecret`, `authVerifier`,
  `encrypt`, `decrypt`, `parseWire`. Add unit tests + a fixed-seed KAT file
  (`lib/sanctuary-e2e/vectors.json`): given P, S, fixed nonce → exact master/contentKey/
  authSecret/verifier/ciphertext. These vectors are the Swift parity contract.
- **Post-audit:** all KATs pass; round-trip (encrypt→decrypt) passes; wrong-key decrypt
  fails closed; tamper (flip a ct byte) fails closed; tsc/lint clean. Commit + push.

### STEP 3 — Backend schema (migration, additive)
- **Pre-audit:** confirm column names don't collide; confirm idempotency; confirm zero
  impact on existing rows (defaults make every existing space non-e2e).
- **Do:** write `migrations/NNN_sanctuary_e2e.sql`: on `story_admin_users` add
  `e2e BOOLEAN DEFAULT FALSE`, `kdf_salt TEXT`, `auth_verifier TEXT`. On the e2e content
  tables (diary/projects/coach_memory/plan rows) ensure a `ciphertext TEXT` column exists
  (additive; legacy plaintext/`gcm:` columns stay for non-e2e rows). Indexes as needed.
  Idempotent `IF NOT EXISTS`. Put the SQL in the handoff/chat; do NOT run it.
- **Post-audit:** SQL re-runnable; no destructive clause; existing-row defaults verified by
  reading the migration; documented for Tredoux to run.

### STEP 4 — Backend e2e auth (claim + login, authSecret verifier)
- **Pre-audit:** confirm the server never receives `P` or `contentKey`; confirm rate-limit +
  race-safety; confirm non-e2e login path is untouched (separate code path keyed on `e2e`).
- **Do:** extend `/api/story/admin/auth` (+ a claim route) so that for an `e2e` username:
  claim stores `{kdf_salt, auth_verifier, e2e=true}`; login verifies `generichash(authSecret)`
  and mints the same JWT. Non-e2e usernames keep the existing bcrypt path exactly.
- **Post-audit:** e2e login works against a Step-2-derived `authSecret` (unit/integration
  test with a known vector); non-e2e (Bayan/Riddick/Tredoux) login STILL works; server logs
  never print `authSecret`/`contentKey`; lint/tsc clean. Commit + push.

### STEP 5 — Backend ciphertext store (journal/coach/projects)
- **Pre-audit:** confirm every read/write for an `e2e` space stores/returns only the
  `ciphertext` blob + safe metadata; confirm NO server decrypt; confirm space-scope from JWT.
- **Do:** for `e2e` spaces, the diary/projects/coach-memory/plan endpoints store the
  client-sent `ciphertext` verbatim and return it verbatim. Non-e2e spaces keep the existing
  server-key path. The Sonnet coach endpoint accepts a device-assembled, plaintext-for-this-
  turn context (the hybrid cloud opt-in) but persists nothing readable for e2e spaces.
- **Post-audit:** grep proves no `decryptDiaryField`/server-key use on the e2e path; existing
  spaces unaffected; a round-trip test stores ciphertext and gets the SAME bytes back; lint/tsc
  clean. Commit + push. **P1+P2 are now DONE and real.**

### STEP 6 — Swift project scaffold (source-only)
- **Pre-audit:** confirm a buildable SwiftUI + SPM layout; confirm `swift-sodium` is the
  right Argon2id/secretbox dependency and pin a version.
- **Do:** write `native/Sanctuary/` — `Package.swift`/xcodeproj, `Info.plist`, the privacy
  manifest (`PrivacyInfo.xcprivacy`), folder layout: `App/`, `Crypto/`, `Net/`, `Coach/`,
  `Store/`, `UI/`. Include a `README_BUILD.md` with exact Xcode steps.
- **Post-audit:** file tree complete + internally consistent (no dangling refs in the
  project file); README lists deps + steps. (Cannot compile here — mark source-complete.)

### STEP 7 — Swift crypto (mirror §3; embed the Step-2 vectors as XCTest)
- **Pre-audit:** map each TS function to its swift-sodium call; confirm identical params +
  ctx strings + wire format.
- **Do:** implement the Swift crypto core + an XCTest that asserts against the copied
  `vectors.json`. This is the parity proof Tredoux runs in Xcode.
- **Post-audit:** code reviewed line-by-line against §3 and the TS impl; XCTest written.
  Tredoux-verification: "open in Xcode, run SanctuaryCryptoTests → all green."

### STEP 8 — Swift key lifecycle (Keychain / Secure Enclave + biometrics + auto-lock)
- Pre-audit → Do (derive on first unlock, wrap in SE, biometric gate, wipe on lock/15-min
  idle) → Post-audit (review against §3 Secure-Enclave rules).

### STEP 9 — Swift networking (talks to the Step-4/5 e2e backend)
- Pre-audit → Do (claim, login with authSecret, push/pull ciphertext) → Post-audit
  (no plaintext ever sent except the explicit cloud-coach turn; review).

### STEP 10 — Swift UI (door → Planner / Coach / Projects, mirror the web sanctuary)
- Pre-audit → Do (clean door like `/bayan`; neutral branding; nav Planner/Coach/Projects;
  per-space) → Post-audit (UX parity review; no "story" wording).

### STEP 11 — On-device coach + persona + cloud opt-in (RESEARCH FIRST)
- **Pre-audit (RESEARCH STEP — do not assume):** verify the CURRENT Apple on-device model
  API (FoundationModels framework), its availability/OS/device requirements, and the
  graceful fallback when unsupported. Confirm how to inject a system persona. (Use web docs;
  this post-dates the model's training cutoff — VERIFY, don't guess.)
- **Do:** wire the on-device model as default; port `about-<space>.md` persona + the coach
  system prompt into its instructions; implement the per-message "ask the deeper coach" →
  Step-5 cloud endpoint with on-device-assembled context; device-capability fallback to
  cloud-only with clear messaging.
- **Post-audit:** persona faithful; cloud opt-in is explicit + consented per message; fallback
  path correct; review.

### STEP 12 — Vault E2E (Tredoux-only) in native
- Pre-audit → Do (device-key E2E for the vault, space=tredoux gate preserved) → Post-audit.

### STEP 13 — App Store prep (docs/metadata, not a submission)
- **Do:** privacy manifest finalized; App Store listing copy + privacy labels (honest:
  "data encrypted on device; we cannot read your journal"); review notes; TestFlight steps.
  Cross-reference `~/Desktop/Montree App Store Pack/`.
- **Post-audit:** claims match reality (no "100%/zero-knowledge" absolutes the app can't back).

### STEP 14 — Final integration audit + Tredoux verification checklist
- **Do:** write `VERIFY.md`: every Tredoux action to take the build live (run migration NNN;
  finish Apple Developer enrolment; open `native/Sanctuary` in Xcode; resolve compile errors
  with the triage guide; run crypto XCTest → green; set bundle id + signing; TestFlight to a
  device; test claim→encrypt→decrypt→coach; submit). Include a backend-rollback note.
- **Post-audit:** checklist is complete + ordered + honest about what's done vs pending.

---

## 6. TREDOUX-ONLY ACTIONS (cannot be done in the build env)
Run migration NNN (SQL in chat) · finish Apple Developer enrolment ($99 + passport via the
Apple Developer iPhone app) · open the Swift source in Xcode, compile + fix + sign · run the
crypto XCTest for parity · TestFlight + on-device test · App Store submit.

## 7. ROLLBACK / SAFETY
- P2 is additive + e2e-only; if anything regresses the web sanctuaries, revert the P2
  commits — non-e2e paths are independent. The migration only ADDS columns (safe to leave).
- Never delete or rewrite existing diary/coach rows. Never weaken the vault `space='tredoux'` gate.

---

## PRIORITY GUARD (read before starting)
Steps 1–5 (crypto core + ciphertext backend) are the part that SHIPS FOR REAL and must end
the night **complete, tested, and clean** — they are worth more than any amount of Swift.
If the night runs short: fully finish + audit 1–5, then write as much Swift source (6+) as
time allows. NEVER leave 1–5 half-done to start Swift. A complete, verified backend + a
partial Swift tree is a great night; a half-wired backend is a bad one.

## 8. REALISTIC OVERNIGHT OUTCOME (set expectations honestly in the final report)
Done-for-real: P1 crypto core (tested + vectors), P2 ciphertext backend (deployable, migration
staged). Source-complete (pending Tredoux compile): the full Swift app + crypto + persona +
App Store docs. Pending Tredoux: migration run, Apple enrolment, Xcode compile/sign/test/ship.
