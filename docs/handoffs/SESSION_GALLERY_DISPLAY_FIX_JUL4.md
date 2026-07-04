# Gallery display fixes — the "photo recognition is broken" scare was READ-SIDE — Jul 4, 2026

**Headline: the pipeline was never broken. Two client-only gallery display gaps made a
perfectly-working capture+identify pipeline LOOK dead on a fresh (cold) account.** Both fixed,
both client-only, both pushed. Pipeline + the Jul-3 curated seed verified HEALTHY under live
production data.

2 commits on main, both `app/montree/dashboard/[childId]/gallery/page.tsx` only:
- `5f219a03` — show the AI draft as a one-tap ✨ suggestion instead of a blank "Untagged"
- `8c658754` — `cache:'no-store'` on the media fetch + refetch on visibility/focus (fresh photos
  appear without a manual pull-to-refresh)

origin/main HEAD = `8c658754`.

---

## 1. What the user reported vs. what was actually wrong

| Symptom (looked like) | Actual cause (DB/git verified) |
|---|---|
| "Every photo says Untagged — worse than when we built it, failing FLAT" (Bright Stars/Sarah) | Pipeline RAN and drafted correctly (Cylinder Blocks Combined ✓, Metal Insets ✓✓). The **child gallery feed only rendered the confirmed `work_id`**, ignoring `sonnet_draft.proposed_name`. On a cold account Gate A rarely auto-confirms → `work_id` NULL → blank "Untagged" even though the AI had the answer. |
| "New school — took 4 photos, not a single one showed up. 0 photos total." (Sunshine/Marina) | **Photos saved fine** (3 rows, correct school+classroom, 2 AUTO-CONFIRMED: Cylinder Block 1, Number Rods). The gallery API returns all 3. The client showed 0 because the media API sends `Cache-Control: max-age=60, stale-while-revalidate=120` and the browser served a **pre-capture "0 photos" snapshot** for up to ~3 min. Pure HTTP-cache staleness. |

**The pipeline itself, measured live on prod data this session:** trigger `capture→attempt = 1s`,
fully processed in `9–22s`, IDs correct, and Gate A **auto-confirmed** the high-confidence ones on
the new cold account (Cylinder Block 1 + Number Rods got a real `work_id`) — the curated global seed
(270 works, Jul 3) is doing its job: higher confidence → more cold-start auto-tags.

---

## 2. The two fixes

**A. `5f219a03` — draft becomes a one-tap suggestion.**
`GalleryItem` widened with `identification_status` + `sonnet_draft.proposed_name/confidence` (the
API already sent them; the client just ignored them). When `work_id` is NULL, not `is_other`, and a
draft `proposed_name` exists on a draft status (`haiku_drafted`/`haiku_matched`/`sonnet_drafted`),
the card renders **✨ {proposed_name}** + a green **✓** button instead of "Untagged". `confirmSuggestion()`
resolves `proposed_name` → a curriculum work (exact then normalized name match against the `curriculum`
state) and PATCHes `work_id` (same effect as the picker); falls back to `openWorkPicker` if the name
doesn't resolve. No new i18n keys (`common.confirm`, `gallery.tapToChange`, `gallery.workUpdated` reused).
Verified: all 4 tested proposed names resolve **EXACT** to the classroom's 329 curriculum works → the ✓
is a true one-tap flash, not a picker walk.

**B. `8c658754` — fresh photos appear without a refresh.**
`fetch(.../media?child_id=…, { cache:'no-store' })` + a `visibilitychange`/`focus` effect that calls
`fetchPhotos()` when the page becomes visible again (returning from the camera). Kills the "0 photos
after capture" scare for good.

---

## 3. What is NOT the cause (ruled out — do not chase these again)

- **The Jul-3 curated seed / photo pipeline.** Unchanged and healthy. It IMPROVED cold-start
  auto-confirm (2/3 new-school photos auto-tagged).
- **Cross-tenant / stale session.** The photos saved to the correct school with the user's session
  → the session IS the new school → not a permission/403 issue.
- **The media API.** `app/api/montree/media/route.ts` unchanged since **May 16** (its cache header is
  old, not a fresh regression).
- **My gallery edits causing "0 photos".** Impossible — the render change runs only when
  `photos.length > 0`; it never touches the fetch or `setPhotos`.

---

## 4. The other two things the user hit (git-verified: NOT code regressions)

- **"Tell me about my students" onboarding screen "missing" then flashing up.** UNCHANGED code.
  `TellGuruCard.tsx` last touched Apr 24; `voice-onboarding/page.tsx` Jun 22. The full-screen
  takeover fires **only in-session right after create/import** (commit `e13ae634`, Jul 3 —
  deliberate: returning logins skip it). It correctly flashed up during the fresh create-school →
  add-student flow. Working as designed. `tell_guru_onboarding` default = true; Sunshine has no
  override (enabled); Marina has no mental profile (so per-child TellGuruCard would also show).
- **Guru chat shelf-fill stopped at 2 of 5 areas** (Pink Tower + Sound Games, both marked
  "Presented", contradicting "start with zero"). Guru shelf-fill code (`lib/montree/guru/tool-executor.ts`)
  **unchanged since May 16** — this is runtime/model behavior (tool-loop quit mid-fill or timed out),
  NOT a yesterday code change. **OPEN — worth investigating** (why it stops early + why "Presented").

---

## 5. Prod data touched this session

- **`montree_media` `d7af53f8`** (the Jul-3 Bright Stars gate photo, stuck on a stale "Spindle Boxes"
  draft) reset to `identification_status='pending'`, `sonnet_draft=NULL`, `work_id=NULL` so the
  audit-page sweep re-runs it through the live pipeline. No other prod data changed.

---

## 6. Architectural notes locked in

1. **The child gallery feed must surface `sonnet_draft.proposed_name` when `work_id` is NULL** — a
   drafted-but-unconfirmed photo shows its AI guess as a ✨ one-tap suggestion, never a blank
   "Untagged". The photo-audit / Wrap Up page already rendered drafts; the gallery did not.
2. **The child-media gallery fetch is `cache:'no-store'` + refetches on visibility/focus.** The media
   API's `max-age=60/SWR=120` otherwise serves stale post-capture snapshots. (Do not remove the
   API cache header — other callers rely on it; fix at the fetch site.)
3. **Gallery ✓ / picker confirm does NOT seed the visual-memory moat** (it only PATCHes `work_id`).
   Only the Wrap Up / Photo-Audit confirm path seeds the moat. So confirming in the gallery tags the
   photo but does not teach the classroom moat — a known gap, and the reason cold accounts need a few
   Wrap-Up confirms before Gate A starts auto-tagging from classroom history. **Candidate follow-up:
   route gallery confirms through the corrections endpoint so they teach the moat too.**

---

## 7. Open / next (nothing blocking)

1. **Guru shelf-fill stopping at 2/5 areas** — investigate the chat tool-loop (early stop / timeout /
   why "Presented" on a "start with zero" child).
2. **Onboarding on individual add** — the takeover is import-only (`e13ae634`); consider firing it when
   a student is added individually too (the user liked seeing it).
3. **Gallery confirm → moat seeding** (rule #3 above) so the "confirm → learns → auto-tags" loop works
   from the gallery, not just Wrap Up.
4. **Clean-photo verification round** (still owed from the Jul-3 canonical seed) — capture clean
   single-material photos → `scripts/retest-cold-start.mjs --media <id>`.

---

## 8. Verification done

- ESLint `--max-warnings=0`: **0 errors** on the gallery page (15 pre-existing warnings, none new).
- Live prod DB: Marina's 3 photos present, correct school/classroom, 2 auto-confirmed; gallery filter
  returns 3; all 4 tested proposed names resolve EXACT to curriculum works.
- Pipeline timing measured live: 1s trigger, 9–22s completion.
- Both commits on origin/main (`8c658754`), pushed via Desktop Commander.
