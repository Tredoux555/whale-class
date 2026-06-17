# 🌿 Lyf Coach — Master Project Doc (START HERE)

**Lyf Coach** is a native iOS app: a private, on-device-encrypted **journal +
life-coach + planner + projects** for the family. Your password derives an
encryption key on your iPhone; the server only ever stores ciphertext it cannot
read. It's the native companion to the montree.xyz personal space.

> **Internal codename:** the Swift crypto module + the server library are named
> `Sanctuary` / `sanctuary-e2e` (the type names like `SanctuaryCrypto` are kept
> identical on client + server so the parity vectors line up). **The product is
> "Lyf Coach"** everywhere the user sees it.

This file is the single entry point. To resume: read this, then `VERIFY.md`.

---

## 1. Where everything lives

**Backend (DONE FOR REAL — tested + deployed to montree.xyz):**
| What | Path |
|---|---|
| Crypto core (TS reference) + KAT tests | `lib/sanctuary-e2e/crypto.ts`, `tests/sanctuary-crypto.test.ts` |
| Cross-language vectors (the contract) | `lib/sanctuary-e2e/vectors.json` |
| e2e auth helpers + tests | `lib/sanctuary-e2e/server-auth.ts`, `tests/sanctuary-server-auth.test.ts` |
| Ciphertext-store helpers + tests | `lib/sanctuary-e2e/content-store.ts`, `tests/sanctuary-content-store.test.ts` |
| e2e auth routes (claim + login) | `app/api/story/admin/auth/route.ts`, `app/api/story/admin/auth/claim/route.ts` |
| e2e content routes | `app/api/story/{diary,projects,events}/**/route.ts` |
| Coach (no readable persistence for e2e) | `app/api/story/coach/route.ts` |
| **Migration (STAGED — you run it)** | `migrations/265_sanctuary_e2e.sql` |

**Native app (SOURCE-COMPLETE — written + reviewed, NOT yet compiled):**
`native/LyfCoach/` —
| Folder | What |
|---|---|
| `project.yml` | XcodeGen spec (target **LyfCoach**, bundle `xyz.montree.lyfcoach`, swift-sodium) |
| `Sanctuary/App/` | `@main`, AppState, config |
| `Sanctuary/Crypto/` | `SanctuaryCrypto` (mirrors the spec), Secure-Enclave key wrap, KeyStore, unlock |
| `Sanctuary/Net/` | `SanctuaryAPI` (talks to the backend) |
| `Sanctuary/Coach/` | on-device coach (FoundationModels) + cloud opt-in + persona |
| `Sanctuary/Store/` | content repository, session key, vault |
| `Sanctuary/UI/` | door → Planner / Coach / Projects (+ owner Vault) |
| `Tests/` | `SanctuaryCryptoTests.swift` + `vectors.json` (the parity proof) |
| `README_BUILD.md` | exact Xcode/XcodeGen build steps + first-build triage |
| `APP_STORE.md` | listing copy, privacy labels, reviewer notes |
| `VERIFY.md` | the ordered go-live checklist |

---

## 2. Will it pass Apple App Store review? — honest verdict

**Yes, it can — there are no structural blockers — but three things MUST be done
before submitting** (none are built yet):

1. 🔴 **In-app account deletion (Guideline 5.1.1(v) — hard requirement).** Any app
   that lets you create an account must offer **in-app account deletion** that
   removes your server-side data. Right now the app has "lock" + "forget this
   device" (local only). **You must add a Settings → "Delete my account" that
   calls a backend delete endpoint** before review. Rejection is near-certain
   without it. (~half a day: one SwiftUI screen + one `DELETE` route that wipes
   the `story_admin_users` row + its content rows for the space.)
2. 🟠 **Privacy policy URL (Guideline 5.1.1).** Account-based apps need a privacy
   policy linked in App Store Connect. Host one on montree.xyz (the honest text
   is already in `APP_STORE.md` §0/§2 — "encrypted on device, we can't read it,
   here's what we can see").
3. 🟠 **Demo account in Review Notes (Guideline 2.1).** The app is login-walled, so
   App Review needs working demo credentials. Reviewer notes already say to
   provide them — create a throwaway e2e account for review.

**Lower-risk, already handled:**
- ✅ **2.3.1 hidden features** — the native app deliberately has NO covert features
  (unlike the old web "Messages" door). Keep it that way.
- ✅ **Privacy labels** — content declared "collected but end-to-end encrypted"
  (honest), no tracking. Manifest at `Sanctuary/Resources/PrivacyInfo.xcprivacy`.
- ✅ **Export compliance** — `ITSAppUsesNonExemptEncryption = false` set (standard
  TLS + libsodium for the app's own data → exempt). Confirm at submission.
- ✅ **Face ID usage string**, HTTPS-only ATS, no private APIs, no payments.
- ✅ **On-device AI** — graceful fallback when Apple Intelligence is unavailable.
- ⚠️ **Naming** — "Coach" is fine as a *life* coach/journal. Avoid any medical or
  mental-health *treatment* claims in copy (the current copy is clean).

**Bottom line:** structurally App-Store-ready. Build account deletion + a privacy
policy + a demo account, and it has a strong shot. No one can *guarantee* review
(it's subjective), but there's nothing here that's a known auto-reject.

---

## 3. How long on Xcode? (you have Xcode 26.3 ✓)

Honest ranges for hands-on work (separate from the 24–48h Apple review wait):

| Phase | Estimate |
|---|---|
| `brew install xcodegen` → generate → open → resolve swift-sodium | 10–20 min |
| **First compile triage** (swift-sodium method signatures, async/`@MainActor`, optional unwraps) | **1–4 hours** — the big unknown is how closely swift-sodium's `pwHash`/`keyDerivation` labels match what I wrote; the crypto XCTest pins it down fast |
| Run `LyfCoachTests` (crypto parity) → green | 15 min |
| On-device run + fix runtime issues (Secure Enclave needs a real device) | 2–4 hours |
| Add account deletion (UI + backend route) | ~half a day |
| Privacy policy page + demo account + screenshots + App Store Connect | ~half a day |
| **→ first TestFlight build** | **~1–2 focused days total** |

The crypto is the highest-risk part and it has a self-checking test, so you'll
know within the first hour whether the device crypto matches the server.

---

## 4. The SQL to run (Supabase SQL Editor, MONTREE project)

Additive + idempotent. Does NOT alter any existing row; `e2e DEFAULT FALSE` keeps
every existing user on the current login. (Also in `migrations/265_sanctuary_e2e.sql`.)

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

**Verify:**
```sql
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name='story_admin_users' AND column_name IN ('e2e','kdf_salt','auth_verifier');
-- expect: e2e=NO, kdf_salt=YES, auth_verifier=YES
```

**Create a Lyf Coach account** (one per person; username = the name typed at the
door — recommend `tredoux`/`bayan`/`riddick`):
```sql
INSERT INTO story_admin_users (username, password_hash, space)
VALUES ('tredoux', 'SET_ON_FIRST_LOGIN', 'tredoux')
ON CONFLICT (username) DO NOTHING;
-- Then in the app: "Set up a new sanctuary" → that username + a strong password.
-- (Existing bcrypt accounts are NOT auto-converted — start fresh e2e accounts.)
```

---

## 5. Resume checklist (the short version of VERIFY.md)

1. Run the SQL above (§4). Verify columns.
2. Create the e2e account row(s) (§4).
3. `brew install xcodegen && cd native/LyfCoach && xcodegen generate && open LyfCoach.xcodeproj`
4. Set Team + signing. Resolve swift-sodium. Fix first-build errors (README_BUILD §6).
5. Run `LyfCoachTests` → all green (crypto parity with the server).
6. **Build the account-deletion feature** (App Store requirement — see §2.1).
7. TestFlight to your iPhone → claim → write → lock → Face ID unlock → coach.
8. Privacy policy page + screenshots + reviewer demo account → submit (APP_STORE.md).

## 6. Git / safety

All work is committed to the `whale-class` repo on `main` (branch is auto-deployed
by Railway, but the native app is inert to the web build). The backend e2e code
is additive + e2e-only; if anything ever regresses the web sanctuaries, revert the
P2 commits — the non-e2e paths are independent. The migration only ADDS columns.
