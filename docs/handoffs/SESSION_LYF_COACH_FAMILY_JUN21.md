# Session — Jun 21, 2026 — Lyf Coach Family Model SHIPPED + coach vision + two-tier GTM

**3 commits on `main` (pushed clean via isolated worktrees off origin/main — the dirty
`account-deletion-jun19` working tree was never touched):**
```
2b1272ee  Lyf Coach Family: captain context channel + seal-preserving Family Brain
          + child coach persona/safeguarding + tz-correct day/time
3816b9eb  Fix build (barrel exports) + coach reads images (vision)
3fca2f79  docs: GTM plan (two-tier locked, App-Store-first) + scripts
```
**Migrations 266 + 267 — RUN + verified in Supabase (whale-class) Jun 21.** Links seeded:
tredoux→riddick (to_child), bayan→riddick (to_child), tredoux→bayan (to_partner); riddick
role=child; the three family-brain tables exist.

---

## What shipped

**1. The seal (load-bearing, both tiers).** Every coach conversation is sealed by
architecture — no member, captain, the Family Brain, or operator can read another person's
sealed room. Full threat model: `docs/handoffs/LYF_COACH_FAMILY_THREAT_MODEL.md`
(independent adversarial audit: 8/8 PASS).

**2. Captain → loved-one context channel (write-only).** Family tab on the Sanctuary
(`/story/admin/family`, parent-gated). Tredoux = captain. Writes observations + skill tags
INTO a loved one's coach. **Child** target = quiet background (never quoted back). **Partner**
(adult) target = transparent (her coach may acknowledge a loved one shared something; never
covert correction; her autonomy absolute). Captain reads back only their OWN notes.
Tables: `story_coach_context_links` (+ link_kind) + `story_coach_context_notes` (encrypted).

**3. Family Brain — seal-preserving.** Individual coaches → abstracted, consented signals →
pattern detection → abstracted per-coach tonal nudges → "nobody surveilled, everyone held."
Reads ONLY structured signals + captain-authored notes; never a sealed room. `emit_family_signal`
tool is consent-gated (child requires consent=true, double-enforced). Parent can query
"what are you seeing in our family?" (pattern-level, never attributed; children NEVER access).
Tables: `story_coach_family_signals` / `_nudges` / `_brain_log` (migration 267) + `birthdate`
for the 16/18 access ladder. Lib: `lib/story/coach/family-brain.ts`.

**4. Child coach persona + safeguarding.** `buildChildCoachSystemPrompt` — emotional-safety
brain (coping, self-worth, naming feelings, gentle dichotomy-of-control), NOT the adult
productivity brain; trimmed `CHILD_COACH_TOOLS`. `child-safeguarding.md` knowledge: on a dark
disclosure the coach stays the child's ally, steers them to a trusted adult, NEVER escalates
to a parent/operator, NEVER emits a signal. Audience branches off the DB role in the coach route.

**5. Day/time fix.** Coach now anchors "today / this morning / tonight" and all event/diary
date defaults to the CALLER's IANA timezone (sent from the browser), not the server clock/UTC.

**6. Coach reads images (vision).** 📎 on the full Coach page + the floating coach. Client
downscales to ~1568px JPEG (`lib/story/coach/image-attach.ts`); route validates an optional
base64 image (allowlisted types, ~5MB cap) and attaches it as an image content block on the
current turn; never persisted; works for adult + child coaches. No separate OCR — Sonnet reads
it natively. **No migration needed for this** — works immediately.

**7. Two-tier product decision (LOCKED) + marketing.** `docs/lyf-coach/LYF_COACH_GTM_PLAN.md`
+ `LYF_COACH_SCRIPTS.md`. One app, two plans: **Sealed** (~$15–20, ships first, light
regulatory) + **Family** (~$50 flat, gated). Brain dial = gentle default + optional captain
steer; seal always; child signals consent-only. Promotion plan's first action = App Store.

---

## 🚨 The build lesson (do not repeat)
The first push (2b1272ee) RED the Railway build: `buildChildCoachSystemPrompt` + `CHILD_COACH_TOOLS`
were added to system-prompt.ts/tool-definitions.ts but never re-exported through the coach
barrel `index.ts`. **ESLint passed; Turbopack didn't.** Fixed in 3816b9eb. The gate now is a
real `tsc --noEmit` over the changed surface (it catches missing-export / type errors that
lint misses) BEFORE every push — not eslint alone.

---

## Pending / next

- **Captain-directive line into the Family Brain** — OFFERED, NOT BUILT. Tell the brain in plain
  words ("ease everyone up this week") → it turns that into gentle per-coach nudges. Small add
  on top of `runFamilyBrain` (a directive input + a directive box on the Family panel). Resume here.
- **App Store (Phase 0, the stated #1 action)** — finish Apple Developer enrolment; confirm the
  built hard-requirements on the native Lyf Coach app (account deletion, privacy URL, demo
  account, NO covert door, honest copy); TestFlight on a real device; ship **Sealed Individual** first.
- **Family public tier** — gated on COPPA/GDPR-K/AADC + verifiable parental consent + Apple kids
  rules + child-psychologist review + legal review. His private family version is live now and
  can move fast; the public child product cannot ship naively.
- **Verify on production** once Railway settles 3fca2f79 (green expected; tsc + eslint clean).

## Verification done
tsc --noEmit clean across coach/family/image surface; eslint clean on all changed files;
independent seal audit 8/8; migrations 266+267 run + verified; every push staged-diff-checked
to only the intended files.

---

## Continued (later Jun 21) — deploy + ops/backups

**Deploy:** all work on `main` (`2b1272ee` → `3816b9eb` → `3fca2f79` → `9b1d3633` handoff).
The first family commit RED the build (missing barrel exports); `3816b9eb` fixed it +
verified with a real `tsc` pass. The green redeploy follows that commit — confirm on Railway
if any doubt, but the export gap is closed and the surface type-checks.

**Coach vision is live** (`3816b9eb`): 📎 on the full Coach page + floating coach reads
images (Sonnet vision, no OCR, image never persisted, adult + child). No migration.

**Two-tier model + marketing LOCKED:** `docs/lyf-coach/LYF_COACH_GTM_PLAN.md` (Sealed first
~$15–20, Family ~$50 gated; brain = gentle default + optional steer; **App Store is action #1**)
+ `LYF_COACH_SCRIPTS.md`.

**Backups (ops, this session — not code):**
- **Master Brain snapshot** (~2.17 GB logical, 27,603 files, node_modules/.next excluded,
  full `.git` history) copied to the **exFAT "Extreme SSD"** drive at
  `/Volumes/Extreme SSD/MasterBrain-Backup-2026-06-21` — that drive is now **unplugged but holds the backup**.
- The **1 TB "Extreme 55DD"** drive (which had an old Time Machine backup + an "Extreme SSD"
  volume, both void) was **erased → single APFS volume → encrypted Time Machine**, now running
  (~183 GB full-system first backup). Encryption password is Tredoux's (only key). Three-way
  protection now: live (Railway/Supabase) + Master Brain snapshot + encrypted Time Machine.

**Still pending for next session:** (1) **captain-directive into the Family Brain** (offered,
NOT built); (2) **App Store Phase 0** (Apple enrolment → hard-requirements → TestFlight → ship
Sealed Individual); (3) Family public tier regulatory gate. Run `npm install` in `montree`
before any local build (node_modules not in the snapshot, by design).
