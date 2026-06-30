# SESSION — Jul 1, 2026 (Cowork) — Supabase security lockdown + coach brain refocus + TikTok growth brains

Big session. Three threads: (A) a full **Supabase security remediation** (4 migrations, all RUN
in production by Tredoux), (B) **re-centering the Montree coach brain** to its original two-lens soul
+ fixing a memory bug (the coach forgot its own name), and (C) adding **TikTok Growth + master Video
Script brains** to both coach codebases, plus TikTok content deliverables.

**Why the Montree coach was edited despite "Lyf Coach moved out":** the standalone `lyfcoach-web`
has NOT cut over yet. The Montree-hosted coach (`montree.xyz/api/story/coach`) still powers Tredoux's
personal coach, Bayan's + Riddick's coaches, AND the new iOS app (`AppConfig.apiBaseURL =
https://montree.xyz`). So edits to the in-Montree coach brain were correct for the brain actually in use.

---

## A. SUPABASE SECURITY REMEDIATION — migrations 275–278 (ALL RUN by Tredoux in SQL Editor)

The Supabase **Security Advisor (linter)** flagged ~90 ERRORs + ~200 WARNs. Root cause: the anon key
ships to the browser (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) and the public schema is served via PostgREST,
but RLS was off on ~115 tables. The app accesses everything **server-side with the service-role key
(bypasses RLS)**, and the only browser-side Supabase clients are 2 files
(`app/montree/super-admin/phonics-videos/page.tsx`, `lib/hooks/useStudentProgressRealtime.ts`) — so
enabling RLS / locking functions was safe.

- **275 `enable_rls_security_lockdown.sql`** — `ENABLE ROW LEVEL SECURITY` on 118 tables (incl. session
  tokens, child mental-health profiles, finances, principal vault) + `security_invoker` on 4 views.
  IF EXISTS + transactional. **RUN ✅.**
- **276 `security_hardening_warnings.sql`** — pin `search_path` + revoke EXECUTE from anon/authenticated
  on all functions WE own (skips pgvector/extension-owned via `pg_depend deptype='e'`; per-function
  exception-skip). **RUN ✅** (first version errored on `vector_negative_inner_product` ownership; corrected).
- **277 `tighten_permissive_policies.sql`** — drop ~25 "USING(true)" permissive policies (the misnamed
  "Service role…"/"Allow all…" ones actually granted to PUBLIC). Transaction-free + idempotent (paste-safe;
  the transactional version kept truncating on paste). **RUN ✅.** **KEPT ON PURPOSE:** `parent_signups`
  "Anyone can submit parent signup" (public intake form).
- **278 `storage_bucket_listing.sql`** — drop broad public SELECT/list policies on 5 buckets (images,
  story-media, story-uploads, work-photos, work-videos). Public URL downloads still work; only the only
  `.list()` is a server route. **RUN ✅.**

**Breach check:** queried `story_admin_users` live — only **6 accounts, all Tredoux/Bayan/Riddick**, no
strangers → no sign of account compromise. A pure read-scrape via the anon key would NOT show in those
tables (only Supabase Dashboard → Logs → API would). Verdict: most likely never exploited (new, low-traffic
app, needs deliberate targeting), but not provably zero.

**🚨 STILL OPEN (security loose ends — NOT done):**
1. **Rotate the Supabase anon + service-role keys** (dashboard → API settings) and redeploy. Strongest move
   if worried — kills any harvested key. Not done.
2. **Force a re-login / invalidate sessions** — session tokens were in exposed tables (`story_login_logs`,
   `story_admin_login_logs`, `story_online_sessions`); enabling RLS stops future leaks but doesn't kill
   already-harvested tokens. Not done.
3. **Leaked-password protection** — Supabase → Auth dashboard toggle. Near-moot (app uses own auth). Optional.
4. **Move `vector` extension out of `public`** — intentionally SKIPPED (low value, breakage risk).
5. **Re-run the linter** to confirm clean (Tredoux didn't know what the linter was — it's Security Advisor).

**⚠️ Watch after deploy:** `child_work_completion` is read live in-browser by `useStudentProgressRealtime`.
275 enabled RLS on it (it has existing parent/teacher policies). If the live student-progress view stops
updating, the browser's auth doesn't match those policies — add a scoped policy or move that feed server-side.

---

## B. COACH BRAIN REFOCUS (Montree `lib/story/coach/`) — two commits, pushed, LIVE

### B1. The "who's Ion?" memory bug — FIXED (`4290a08c`)
Bayan named her coach **Ion**; one day it asked "who's Ion?". Root cause: there is **no first-class
coach-name field** — the name lived only in conversation/memory, and the nightly Haiku **consolidation**
(`consolidation.ts`) prunes anything not a "durable fact about the user," so it dropped the coach's own name.
Fix (3 layers): pinned **"Your name is Ion"** in `about-bayan.md`; a **general system-prompt rule** (any coach
given a name owns it, never questions/forgets it); **consolidation now protects identity** (coach name + key
people) as a never-prune fact. *Future proper fix (not done): a real `coach_name` column + "name your coach" UI.*

### B2. Re-centered to a TWO-LENS life coach (`f14d37a1`) — the "feels dumb" fix
Diagnosis: the coach had drifted into a productivity **chief-of-staff** that force-fed **all 15 framework
summaries every turn** (~2,235 tokens under "QUOTE these frameworks") + ran a WIP/priority checklist — the
inverse of the "coach in your corner" brand. Decided (with Tredoux): **two operating lenses — psychology
(heal) + self-help (reach goals)**; Stoicism as **temperament**, not a third engine. Changes (net −52 lines):
- **P1:** `getCoachWisdomSummary()` no longer dumps 15 frameworks (**8,940 → 607 chars**); it's now a one-line
  *index* — full text still on-demand via `consult_wisdom`. "Listen first; reach for a framework only when it earns it."
- **P2:** prime directive re-centered on the PERSON ("help HEAL + REACH WHAT MATTERS"); WIP/priority machinery
  demoted to a tool it *has*, not its soul.
- **P3:** presence before action — reflect first, **offer before** booking/logging (was "ACT on it").
- **P4:** Stoic temperament woven into the voice (calm, dichotomy of control, meaning) — no new section.
- **Verified live:** vulnerable message → coach led with empathy + one open question, no framework-dumping. ✅

*Model facts:* tiering is per-user monthly Sonnet cap → silent Haiku over cap (free 200 / paid 500 / welcome
1000). **Owner `tredoux` is comped (always Sonnet).** **Bayan checked live: 47/200 → on Sonnet.** Family-comp
is a TODO in `entitlement.ts` — comp Bayan/family eventually so a heavy month never drops her to Haiku.

---

## C. TIKTOK GROWTH + MASTER SCRIPT BRAINS (both codebases)

- **`tiktok_growth` knowledge module** — distribution/growth layer (2026 algorithm: completion + early
  velocity, shares>saves>likes, story-only/"sell without selling", volume beats a cold algorithm, small-budget
  Spark Ads, view→signup, **mental-health compliance firewall**). Added to **montree** (`81dfbc40`, on-demand
  via consult_wisdom + system-prompt trigger) AND **lyfcoach-web** (`a02b04d`, scoped to the `create` purpose).
- **Video Script Brain upgraded to master** (`video-scripts.md`, 411→521 lines): added Module 4 hook swipe file,
  Module 5 story structures, Module 6 retention-editing masterclass, Module 7 script-doctor rubric. Synced to
  both repos. lyfcoach-web also got decided positions + gameplan updates (`b93e1c3`).
- **Decided positions (live @lyf.coach):** (1) story-only — product NEVER in the video; pitch in caption/bio;
  (2) volume beats a cold algorithm — plateau after a test batch = distribution gap, not quality; (3) cover/
  first-frame is its own lever (0:01 drop = cover failed). 12–20s is the sweet-spot length.

**TikTok content deliverables (in `~/Downloads`, reference — not code):** `lyfcoach-100-hooks.md`,
`Lyf Coach - 100 Hooks.docx`, `lyfcoach-top3-shoot-ready.md`, `lyfcoach-scripts-the-strong-one.md`,
`tiktok-growth-specialist.md` (+ research appendix), QR codes, and the centered "First Light" TikTok zoom MP4.
**@lyf.coach status:** 3 founder talking-head videos (461→332→115 views, ~4.6s avg watch / 0.3% completion =
hook/cover problem, NOT shadowban). Next: shoot tight 15–20s "the strong one" story-only cuts; don't boost
until a video holds completion.

---

## COMMITS THIS SESSION
**montree (`main`, pushed, Railway auto-deploy):** `81dfbc40` (tiktok_growth + master video-scripts) ·
`4290a08c` (Ion identity fix) · `f14d37a1` (two-lens refocus) · `dcfd7f17` (migration 275) · `4cd0bfd1`+`a2ca1e40`
(migration 276 + fix) · `50db9b1a` (migrations 277+278).
**lyfcoach-web (`master`, pushed):** `a02b04d` (tiktok_growth module + wiring) · `b93e1c3` (decided positions +
master video-scripts + gameplan).

## NEXT SESSION — pick up here
1. Confirm app still works post-migrations (coach replies, images display, live student-progress updates).
2. Re-run Security Advisor; confirm near-clean.
3. Security loose ends: rotate anon+service keys + force re-login (the session-token residual).
4. Comp Bayan/family (entitlement.ts TODO) so she's never dropped to Haiku.
5. Optional: real `coach_name` column + "name your coach" UI (proper Ion fix for public users).
6. TikTok: shoot the 3 "strong one" story-only cuts; fix covers/hooks; only boost a video that holds completion.
