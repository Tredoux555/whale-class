# Whale / Montree — Latest Handoff

**Last updated:** Apr 30, 2026, end of day
**Live on Railway:** commit `99b34723` (or whatever's latest after cleanup)

This is the resume-from-here document. If you're a new session, read this first, then `CLAUDE.md` for full project context.

---

## What just happened today (Apr 30, Session 76)

A full audit & optimise sweep. Three audits → 17 fixes → all shipped. Then a Turbopack build fix. Then a root-folder cleanup.

### Commits pushed today (in order)

| SHA | What | Status |
|-----|------|--------|
| `022bef0f` | i18n auto-derived SELECTs + unified guide translator | ✓ live |
| `f4fd150f` | Brain + i18n handoff doc | ✓ live |
| `80921de6` | I18nProvider memo + service worker immutables-only + ai-generator tier-aware | ✓ live |
| `5ef016b2` | DashboardHeader memo + photo-audit dynamic loading + daily-brief stale-works parallel + guide 404 cache | ✓ live |
| `68ea89e2` | Tier-gate language-presentation + language-semester | ✓ live |
| `149e5760` | Tier-gate 5 remaining Sonnet routes | ✓ live |
| `f5e459e9` | Brain Session 76 + sweep handoff | ✓ live |
| `9f81dc97` | **Build fix:** photo-audit `dynamic()` options must be inline literals (Turbopack) | ✓ live |
| `5c0f63e4` | Brain: note Turbopack constraint | ✓ live |
| `8aa8f94d` | Cleanup commit 1 — handoffs to docs/handoffs/ | ✓ live |
| `0e9b1da9` | Cleanup commit 2 — outreach to docs/outreach/ (backup preserved in archive/) | ✓ live |
| (next) | Cleanup commit 3 — marketing to docs/marketing/ | ✓ live |
| (next) | Cleanup commit 4 — artifacts to docs/artifacts/ | ✓ live |
| `d72c9c6c` | Cleanup commit 5 — orphaned scripts to scripts/legacy/ + delete dupes | ✓ live |
| `99b34723` | Cleanup round 2 — 7 more scripts, 3 root icons, html prototype, phonics zip | ✓ live |

> Exact intermediate SHAs may differ — `git log --oneline -20` for the full sequence.

---

## Health check sweep — finished

Frontend perf + AI cost + tier-gating across 17 items. All shipped. Highlights:

- **I18nProvider value memoized** — locale switching no longer re-renders all 173 i18n importers on parent state changes.
- **Service worker immutables-only** — fixed the Apr 30 stale-dashboard incident. HTML pages always go to network; only JS/CSS/fonts/images cached.
- **8 routes now tier-gated** via `resolveReportModel()`: language-presentation, language-semester (3 calls), teaching-instructions, snap-identify, weekly-review POST+PATCH, generate-work-content. Plus ai-generator.ts now accepts a tier-aware `model` param. corrections/route.ts skips Sonnet enrichment for free-tier (correction itself still saves).
- **DashboardHeader `memo()` wrapped**, photo-audit dynamic imports got `loading` fallbacks, guide 404 path got Cache-Control, daily-brief stale-works query parallelized with its dismissals query.

**Cost impact:** ~$300-400/month savings projected at 10 schools on Core tier (no more Sonnet rates on routes that should run Haiku for paying-but-not-Premium schools).

### Known deferred (for next dedicated session)

- **Weekly-wrap teacher + parent batching** — `app/api/montree/reports/weekly-wrap/route.ts`. Reports run sequentially per child today; parallelizing via `Promise.all` would halve wall-clock per child (~30-60s/child win). Not done because the refactor interleaves token totals, separate upserts, and skip flags. ⚠ **Replan must stay Stage 0** when you tackle it.

---

## Root folder cleanup — finished

Whale folder went from 90 → 42 root entries. Everything moved to its proper home:

| Destination | What's there |
|-------------|--------------|
| `docs/handoffs/` | 8 stale .md plans/handoffs (CHINESE_LOCALIZATION, HEALTH_CHECK, SESSION_56, PLAN-v1/2/3, Web_Claude_*, etc.) |
| `docs/outreach/` | 10 outreach .xlsx files + 1 cold-email .docx |
| `docs/outreach/archive/` | `Montree_Master_Outreach_backup_pre_Apr16.xlsx` (preserved) |
| `docs/marketing/` | HeyGen scripts, promo .docx, montree-pitch.html, montree-video-scripts.html, montree-icon-preview.png, thumbnails.jpg, montree-logo.png/.svg, montree-tree-icon.png, report-format-prototype.html |
| `docs/artifacts/` | 10 generated reports + classroom PDFs + Language_Semester_Reports/ folder + phonics-images.zip |
| `scripts/legacy/` | 14 orphaned root scripts (no code references): check-stale-corrections.js, ami-docx-builder.py, eric_*.py, esl_*.py, generate-*.{js,py}, etc. |

**Deleted:** `document_1.docx` + `document_2.docx` (identical AutoSave dumps, same size + date), `.test_write`, `.DS_Store`, Excel `.~lock` files. All real data preserved.

**Verified before moving:** zero references to relocated files in `app/`, `components/`, `lib/`, `public/`, `package.json`, or `Dockerfile`. The build is unaffected.

### Possibly next-session candidates (left at root for now)

- `3D Printed Classrooms/` and `3d-montessori/` — old project folders (Feb 24), unclear if active. Either move to `docs/artifacts/` or delete.
- `tsconfig.tsbuildinfo` — TS incremental cache; should probably be in `.gitignore`.

---

## Next session priorities (in priority order)

1. **🚨 Verify Railway deploy is green.** Visit:
   - `https://montree.xyz/montree/dashboard` — header renders, daily-brief panels load, no console errors
   - `https://montree.xyz/montree/dashboard/photo-audit` — page loads, dynamic chunks show "Loading…" briefly then render
   - Switch locale EN ↔ 中文 ↔ ES — should feel snappier, no flicker
2. **🚨 Test the tier gates.** In `/montree/super-admin`:
   - Set Whale Class to **Free** → try generating a Language Presentation → expect HTTP 402 + "requires an active AI tier"
   - Try Snap Identify → expect 402
   - Submit a photo correction → still saves (just no Sonnet enrichment)
   - Set back to **Premium** → everything works
3. **Per-locale parent narratives** — 6 routes still Chinese-only (Session 75 handoff has full list). Bigger scope.
4. **Phase 10 — Super-admin dark forest** — 31 of 32 pages still need conversion.
5. **Weekly-wrap teacher+parent parallelization** — the deferred ~30-60s/child perf win.
6. **Send the 3 hot lead Gmail drafts** — Copenhagen, Paint Pots UK, Ardtona House UK.
7. **FAMM Argentina follow-up** — past Apr 28 deadline.
8. **Welcome Тамі** in Ukrainian — first organic Ukrainian signup.
9. **Disable `tell_guru_onboarding` for Whale Class** if Amy's card is still appearing:
   ```sql
   UPDATE montree_school_features SET enabled=false
     WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc'
     AND feature_key='tell_guru_onboarding';
   ```
10. **Fix Resend domain** — verify montree.xyz in Resend, update `RESEND_FROM_EMAIL` in Railway.

---

## Don't break these (architectural rules)

- `maxDuration = 120` on `app/api/montree/photo-identification/process/route.ts` — Railway default 15s would kill the two-pass Haiku pipeline.
- `HAIKU_TRUST_CONFIDENCE = 0.85` — Pass 2b discriminator threshold.
- **Replan Stage 0 ordering** in `weekly-wrap/route.ts` — replan MUST run before reports.
- Cross-pollination security: every route accepting `child_id` calls `verifyChildBelongsToSchool()`.
- 173 files import via `lib/montree/i18n` barrel — don't change its public exports.
- **Service worker MUST stay immutables-only.** If a future change adds HTML to the cache, the stale-shell-when-API-fails bug returns. The pattern lives in `public/montree-sw.js` `isCacheable()`.
- **Every new Sonnet-calling route MUST tier-gate via `resolveReportModel()`** at the top after auth. Pattern: resolve → 402 if free → pass `aiTier.model` into `messages.create({ model, … })`.
- **`enrichVisualMemoryFromCorrection()` is intentionally Free-tier-skipped** (moat-builder for paying schools only).
- **`I18nProvider` value MUST stay memoized.** If a future change rebuilds the value on every render, you reintroduce the tree-wide re-render storm.
- **Turbopack:** `next/dynamic(import, { … })` requires the options arg as an **inline object literal** at the call site. Hoisting into a `const dynamicOpts = { ... }` breaks the build with "next/dynamic options must be an object literal." Loading component reference is fine; just keep the surrounding `{ }` inline.

---

## Where to find things now

- **Project rules + session log:** `CLAUDE.md` (root)
- **This handoff:** `HANDOFF_LATEST.md` (root, also mirrored at `~/Desktop/Master Brain/HANDOFF_Apr30_audit.md`)
- **Older handoffs:** `docs/handoffs/`
- **Outreach spreadsheets + templates:** `docs/outreach/`
- **Marketing materials:** `docs/marketing/`
- **Generated reports + classroom PDFs:** `docs/artifacts/`
- **AI cost audit (with Sonnet line numbers):** `docs/AI_COST_AUDIT.md`
- **Multilingual handoff (Session 75):** `docs/I18N_REFACTOR_HANDOFF.md`
- **Dark forest redesign progress:** `docs/DARK_FOREST_REDESIGN_HANDOFF.md`
- **Orphaned old scripts (kept for archaeology):** `scripts/legacy/`

---

## Status snapshot

- **Codebase:** clean, ~42 root entries, all standard Next.js project structure
- **AI tier system:** every Sonnet-calling route now respects Free/Core/Premium
- **Service worker:** v2, immutables-only, no more stale-shell trap
- **i18n:** auto-derived SELECTs + unified guide translator + 12 locales fully wired
- **Photo identification pipeline:** hardened (Pass 1 capped, Pass 2b discriminator, adaptive visual memory budget)
- **Outreach DB:** ~536 contacts, 3 hot leads awaiting Tredoux's send (Copenhagen, Paint Pots UK, Ardtona House UK), FAMM Argentina overdue for follow-up
- **Tomorrow:** verify deploy, test tier gates, then pick from the priority list
