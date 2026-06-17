# Sanctuary Native — VERIFY & Go-Live

The single checklist to take the build live. Ordered. Honest about done vs pending.

---

## What's DONE FOR REAL (in this repo, tested + deployed)

- **P1 — crypto core (TS reference).** `lib/sanctuary-e2e/crypto.ts` + 14 KAT
  tests green; `vectors.json` is the cross-language contract.
- **P2 — ciphertext backend.** e2e auth (claim + login via authSecret verifier)
  and the diary/projects/events ciphertext store + the coach "no readable
  persistence for e2e" guard — all unit-tested (17 + 8 tests), eslint/tsc clean,
  **pushed to main / deployed.** The e2e code is INERT until you run migration
  265 and flip a space to e2e — the web sanctuaries are untouched (reads use a
  wide-select-with-42703-fallback; writes are body-driven and guarded).

## What's SOURCE-COMPLETE (written + reviewed, NOT compiled here)

- The full Swift app under `native/Sanctuary/` — crypto (mirrors §3), Secure-
  Enclave key lifecycle, networking, UI (door → Planner/Coach/Projects + owner
  Vault), on-device + cloud-opt-in coach. **No Xcode in the build env**, so this
  has never been compiled/signed/run. Treat the first build as triage
  (README_BUILD.md §6).

## What's PENDING YOU (cannot be done in the build env)

Run migration 265 · Apple Developer enrolment · Xcode compile/fix/sign · run the
crypto XCTest · TestFlight + device test · App Store submit.

---

## STEP-BY-STEP GO-LIVE

### 1. Run migration 265 (Supabase SQL Editor — MONTREE project)

Paste and run this. It is additive + idempotent; safe to re-run; it does NOT
alter any existing row, and `e2e DEFAULT FALSE` keeps every existing user on the
bcrypt path. (Full file: `migrations/265_sanctuary_e2e.sql`.)

```sql
BEGIN;
ALTER TABLE story_admin_users ADD COLUMN IF NOT EXISTS e2e           boolean NOT NULL DEFAULT false;
ALTER TABLE story_admin_users ADD COLUMN IF NOT EXISTS kdf_salt      text;
ALTER TABLE story_admin_users ADD COLUMN IF NOT EXISTS auth_verifier text;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'story_diary_entries','story_projects','story_coach_memory',
    'story_plan_events','story_plan_days','story_coach_log'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS ciphertext text;', t);
  END LOOP;
END $$;

ALTER TABLE story_diary_entries  ALTER COLUMN entry_date   DROP NOT NULL;
ALTER TABLE story_diary_entries  ALTER COLUMN body_enc     DROP NOT NULL;
ALTER TABLE story_projects       ALTER COLUMN title_enc    DROP NOT NULL;
ALTER TABLE story_coach_memory   ALTER COLUMN memory_type  DROP NOT NULL;
ALTER TABLE story_coach_memory   ALTER COLUMN content_enc  DROP NOT NULL;
ALTER TABLE story_plan_events    ALTER COLUMN event_date   DROP NOT NULL;
ALTER TABLE story_plan_events    ALTER COLUMN title_enc    DROP NOT NULL;
ALTER TABLE story_plan_days      ALTER COLUMN plan_date    DROP NOT NULL;
ALTER TABLE story_plan_days      ALTER COLUMN plan_enc     DROP NOT NULL;
ALTER TABLE story_coach_log      ALTER COLUMN question_enc DROP NOT NULL;
COMMIT;
```

Verify:
```sql
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name='story_admin_users' AND column_name IN ('e2e','kdf_salt','auth_verifier');
-- expect: e2e=NO, kdf_salt=YES, auth_verifier=YES
```

> No new env var is needed for e2e (the server never holds the content key).
> `STORY_JWT_SECRET` must already be set (it signs the session JWT).

### 2. Confirm the deploy built

The deploy added `libsodium-wrappers-sumo` to `package.json`. Confirm the latest
Railway build succeeded (it installs that package). If a build ever fails on it,
the previous deploy stays live — the web sanctuaries are unaffected either way.

### 3. Create the e2e accounts

e2e is **space-scoped + additive** — existing (bcrypt) accounts are NOT auto-
converted. Provision a fresh e2e account per person:

- Create an **unclaimed** `story_admin_users` row with the desired `username`
  (recommend username == space label, e.g. `tredoux`/`bayan`/`riddick`),
  `password_hash = 'SET_ON_FIRST_LOGIN'`, and the right `space`. (Use your
  existing members/admin flow, or insert directly.)
- The person opens the native app → "Set up a new sanctuary" → enters that
  username + a strong password. The app derives keys on-device and claims the
  account as e2e. From then on it's native-only (the web door can't log it in —
  e2e login needs the authSecret the web doesn't have).

> Converting an EXISTING bcrypt account to e2e is a separate, explicit, audited
> migration (it would re-key existing rows). Not part of this build — start the
> family on fresh e2e accounts.

### 4. Apple Developer enrolment

Finish enrolment ($99 + passport via the Apple Developer iPhone app). Needed for
signing + TestFlight.

### 5. Open + compile the app

```bash
brew install xcodegen
cd native/Sanctuary && xcodegen generate && open Sanctuary.xcodeproj
```
Xcode resolves `swift-sodium`. Set Team + bundle id (`xyz.montree.sanctuary`).
Work the first-build triage in `README_BUILD.md` §6 (likely swift-sodium method
signatures, async annotations). Keep iterating until it builds.

### 6. Run the crypto parity test (the contract)

Select **SanctuaryCryptoTests** ▸ ⌘U. It loads `Tests/vectors.json` and asserts
the Swift crypto matches the reference byte-for-byte. **All green = the device
crypto is identical to the deployed backend.** If red, fix before storing any
data (a mismatch means the device couldn't talk to the server's e2e auth).

### 7. TestFlight + on-device test (real device — needs the Secure Enclave)

1. Archive ▸ Distribute ▸ TestFlight; add yourself as a tester.
2. On the device, for the e2e account you created:
   - **Claim:** "Set up a new sanctuary" → username + strong password → lands in
     the app. (Server now has only `{kdf_salt, auth_verifier}` for that account.)
   - **Encrypt→decrypt round-trip:** add a Journal entry, a Project, a Planner
     event. Background the app, reopen → all present and readable.
   - **Lock + biometric unlock:** tap the lock; Face ID re-unlocks WITHOUT the
     password (no Argon2). 15-min idle / backgrounding auto-locks.
   - **Coach:** ask a normal question (on-device, supported devices). Tap "Ask
     the deeper coach" → one explicit cloud reply.
   - **DB check (optional):** in Supabase,
     `SELECT id, LEFT(ciphertext,4) FROM story_diary_entries ORDER BY created_at DESC LIMIT 1;`
     → newest e2e row's ciphertext starts with `sb1`, and `body_enc`/`entry_date`
     are NULL.

### 8. Submit to the App Store

Follow `APP_STORE.md`: privacy labels (content = collected-but-encrypted, NOT
"not collected"), reviewer notes (no hidden features; demo account), screenshots
on device, submit.

---

## BACKEND ROLLBACK / SAFETY

- P2 is **additive + e2e-only.** If anything ever regresses the web sanctuaries,
  revert the P2 commits — the non-e2e (bcrypt + server-key) paths are
  independent and untouched. The 4 backend commits are:
  Step 3 (migration) · Step 4 (auth) · Step 5 (ciphertext store).
- The migration only **ADDS columns + relaxes NOT NULL** — safe to leave in
  place even if the native app never ships. To fully reverse (not required): drop
  the added columns and re-add the NOT NULLs, only if no e2e rows exist.
- Never weaken the vault `space='tredoux'` gate; never auto-convert an existing
  space to e2e.

## HONEST CEILING (state it in the app — already in the door + APP_STORE.md)

An unlocked/seized device defeats all of this. Metadata (that you log in, when,
that entries exist) is never hidden. A fully-compromised server enables an
offline dictionary attack on a *weak* password. Mitigations: Argon2id (slow),
strong-password requirement, Secure-Enclave key wrapping, on-device AI for the
live turn. This is honest, strong, device-grade privacy — not magic.
```
