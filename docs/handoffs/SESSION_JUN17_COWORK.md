# Session Handoff — Cowork, Jun 17 2026

Everything done this session, logged. Working tree is clean; all code is pushed to `main`
(Railway auto-deployed). The next move is the **native marathon build** — see the very
bottom for how to kick it off.

Commit range this session: `0ddcfed5 → d173e9b9` (+ this handoff commit).

---

## A. Phonics bulk video uploader — SHIPPED (not yet used)
**Files:** `app/montree/super-admin/phonics-videos/page.tsx`
**Commits:** `66c95263`, `db1da885`

- Rewrote the uploader into a **drop-everything-at-once queue**. Drag in all the `.mp4`s
  (or multi-select). Each file **auto-matches to its lesson by the leading number** in the
  filename (hardened so `9x16` / `1080p` prefixes can't be misread — 14/14 unit cases pass);
  a **per-file dropdown** fixes any it can't read.
- Uploads **one-by-one with 3× auto-retry** + per-attempt timeout, plus a **"retry failed"**
  button. Bytes go browser → Supabase storage directly, so a VPN drop is survivable and
  neither the VPN nor an agent is in the loop.
- **STATUS: deployed, NOT yet used.** Tredoux hasn't located the video files yet — picking
  this up later. When ready: open **montree.xyz/montree/super-admin/phonics-videos**, drop
  all the `.mp4`s, fix any dropdowns, hit **Upload**, leave the tab open.

## B. Dark Phonics songs page — share-ready — SHIPPED
**Files:** `public/dark-phonics-songs.html`, `public/dark-phonics.html`
**Commit:** `66c95263`

- Each song now leads with the **audio player + download**; the long Suno **Title/Style**
  and **Lyrics** are folded behind tap-to-expand (still there to remix, out of the way).
- Every song got a **🖨 Printable lesson pack** link → `/montree/library/lesson/N` (the
  existing per-lesson flashcard launcher: 3-part cards, bingo, labels, readers…). So:
  play the song, print the pack — a phonics lesson in a packet for summer camp.
- **STATUS: deployed.** Colleague-shareable at **montree.xyz/dark-phonics.html**.

## C. Bayan's Sanctuary — LIVE & WORKING
**Files:** `app/bayan/page.tsx`, `lib/story/coach/about-bayan.md`, `middleware.ts`,
`app/api/story/admin/auth/route.ts`, `app/api/story/admin/auth/claim/route.ts`,
`app/story/admin/page.tsx`
**Commits:** `66c95263`, `db1da885`, `ef6db011`, `cce9103c`, `ea9ed38b`, `d173e9b9`

- **Her door:** **teacherpotato.xyz/bayan** — clean "Welcome / Your space", single password
  field. **Username `B`, password `ayan`** (set via SQL; she only types `ayan`).
  Lands in her Coach. Identical experience to Riddick.
- **Her Coach already knows her:** `lib/story/coach/about-bayan.md` is a trauma-informed
  brief, auto-loaded for `space='bayan'` — centered on healing from severe childhood abuse
  (mother as the source; none of it her fault), breaking the cycle for her kids' sake,
  self-compassion, believe-her-first, safety + autonomy. **Deliberately excludes** the
  marriage grievances / sexual / violence framing — her private space can't re-wound her.
  First visit runs a gentle intake.
- **Isolation:** `space='bayan'` walls her data off server-side. `/bayan` added to both the
  middleware **domain-isolation list** (teacherpotato-only, never montree.xyz) AND the
  **publicPaths allowlist** (the fix for the earlier "redirect to home" bug — it was only
  in the first list, not the second).
- **First-login password-claim infra** (auth-route sentinel + `/api/story/admin/auth/claim`
  + `/story/admin` claim UI) was built then simplified away from Bayan's door. It's left in
  the codebase, harmless and reusable later.
- **SQL run this session (done):**
  ```sql
  DELETE FROM story_admin_users WHERE username = 'Bayan';
  INSERT INTO story_admin_users (username, password_hash, space)
  VALUES ('B', '$2b$10$10emXSAQw2dBUO0vmcoDP.KY2oMNld1klDuHXjS5G4R23FpuqSXT.', 'bayan')
  ON CONFLICT (username) DO UPDATE
    SET password_hash = EXCLUDED.password_hash, space = EXCLUDED.space;
  ```
- **STATUS: working — Tredoux confirmed login.**

## D. Vault hardening — SHIPPED (imperative: vault is Tredoux-only)
**Files:** 7 vault routes under `app/api/story/admin/vault/*`
**Commit:** `ef6db011`

- Found that 7 of 12 vault **write/delete** routes trusted only a vault token, not the
  owner's identity — so a leaked vault token could have **deleted** the material Tredoux
  wants to keep. Fixed: **all 12 vault routes now require `space === 'tredoux'`** (read,
  write, AND delete). Bayan/Riddick structurally cannot touch the vault; a leaked token is
  useless to a non-owner.
- **STATUS: deployed.**

## E. Native marathon — PLANNED (ready to execute)
**Files:** `docs/SANCTUARY_NATIVE_MARATHON.md`, `docs/SANCTUARY_NATIVE_BUILD_RUNBOOK.md`
**Commits:** `32c8c64c`, `894f23cb`, `fa08480d`

- **Decision locked: HYBRID coach** — on-device model by default (nothing leaves her phone),
  per-message "ask the deeper coach" cloud opt-in. **Stack: Swift/SwiftUI** (first-class
  Apple on-device model + Secure Enclave). Journal always device-encrypted.
- **`docs/SANCTUARY_NATIVE_BUILD_RUNBOOK.md` is THE overnight execution doc** — audit
  cadence (pre-audit → do → post-audit → clean-gate per step), full crypto spec
  (libsodium both sides, Argon2id, password/content-key never sent to server), 14 audited
  steps, data-safety invariants, and an honest scope (P1 crypto core + P2 ciphertext
  backend ship for real; the Swift app is written as source for Tredoux to compile in Xcode).

---

## OPEN ITEMS (Tredoux)
1. **Upload the Dark Phonics videos** when the files turn up — uploader is ready and waiting.
2. **Finish Apple Developer enrolment** (~80%) — gates anything reaching a device / the App Store.
3. **Migration for the native e2e backend** — the marathon build writes it; run it when prompted.
4. **Kick off the marathon build** (below).

## HOW TO START THE OVERNIGHT MARATHON
Refresh, then say:

> **"Execute `docs/SANCTUARY_NATIVE_BUILD_RUNBOOK.md` — build the sanctuary native marathon,
> following the audit cadence in §0. Finish steps 1–5 (crypto core + ciphertext backend)
> complete and clean before any Swift, then write as much Swift source as the night allows."**

The runbook is the full brief — it doesn't need anything else.
