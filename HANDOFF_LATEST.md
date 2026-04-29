# Audit & Optimise Day — Apr 30, 2026 ✅ COMPLETE

**Status:** All 17 items shipped. 4 commits on `main`, all pushed. Railway will auto-deploy.

| Commit | What |
|--------|------|
| `80921de6` | I18nProvider memo + SW immutables + ai-generator tier-aware |
| `5ef016b2` | DashboardHeader memo + photo-audit dynamic loading + daily-brief stale-works parallel + guide 404 cache |
| `68ea89e2` | Tier-gate language-presentation + language-semester |
| `149e5760` | Tier-gate 5 remaining Sonnet routes (teaching-instructions, snap-identify, weekly-review POST+PATCH, corrections enrichment, generate-work-content) |

---

## Sweep Tracker (final state)

| # | Item | Status |
|---|------|--------|
| 1 | I18nProvider memo wrap | ☑ |
| 2 | Service worker — cache only immutables | ☑ |
| 3 | ai-generator.ts accepts optional `model` | ☑ |
| 4 | DashboardHeader memo() | ☑ |
| 5 | Photo-audit dynamic-import loading fallbacks | ☑ |
| 6 | Guide endpoint 404 cache header | ☑ |
| 7 | Cap `negative_descriptions[]` FIFO | ☑ already at 8 |
| 8 | Daily-brief stale-works parallelize | ☑ |
| 9 | Weekly-wrap teacher+parent batching | ⚠ verified — deferred (invasive refactor, separate session) |
| 10 | Photo-audit `select('*')` claim | ☑ verified clean — already explicit columns |
| 11 | Tier-gate language-presentation | ☑ |
| 12 | Tier-gate language-semester (3 calls) | ☑ |
| 13 | Tier-gate teaching-instructions | ☑ |
| 14 | Tier-gate snap-identify | ☑ |
| 15 | Tier-gate weekly-review (×2 calls) | ☑ |
| 16 | Tier-gate corrections (Sonnet enrichment only) | ☑ — correction itself still saves; only moat-builder is gated |
| 17 | Tier-gate generate-work-content | ☑ |
| 18 | Final commit + push + brain update | ☑ |

---

## What you're getting

**Perceived speed:**
- Locale switching no longer triggers a tree-wide re-render storm (173 i18n importers).
- Dashboard header skips re-render on every parent state change.
- Photo-audit chunks no longer flash blank gaps while loading.
- Daily-brief loads ~50ms faster (one fewer sequential query).

**Reliability:**
- Service worker no longer caches HTML, so the dashboard can never serve a stale shell while live API calls fail. (This was the Apr 30 incident.)
- Guide endpoint short-caches "not found" responses so we don't keep re-running the 3-tier lookup for works without guides.

**Cost / monetisation:**
- 8 routes (one fixed in Session 76 + 7 newly tier-gated) now respect Free/Core/Premium. Free schools get 402, Core uses Haiku, Premium uses Sonnet.
- Estimated savings at 10 schools on Core tier: ~$300-400/month.
- Whale Class itself: ~$2-3/month.

---

## What got deferred (with reason)

**Weekly-wrap teacher + parent report parallelization.** Currently per child: `await teacher report → await parent report → upsert both`. Could be `await Promise.all([teacher, parent]) → upsert both`. Halves wall-clock per child. Refactor is more invasive than it looks because tokens, upserts, skip flags, and existing-report sets all interleave. Worth a dedicated session with full attention. **Don't break replan Stage 0 ordering** when you do this.

---

## How to verify nothing broke

1. **Railway deploy.** Wait for the latest deploy of `149e5760` to go green. Then visit:
   - `/montree/dashboard` — header renders, daily-brief panels load, no console errors
   - `/montree/dashboard/photo-audit` — page loads, dynamic chunks show "Loading…" briefly then render
   - Switch locale EN ↔ 中文 ↔ ES — should feel snappier, no flicker
2. **Tier gates work.**
   - Set Whale Class to Free in super-admin (`/montree/super-admin` → schools tab → AI tier pill)
   - Try generating a Language Presentation → expect 402 + "requires an active AI tier"
   - Try Snap Identify → expect 402
   - Submit a photo correction → still saves (just no Sonnet enrichment in the moat)
   - Set back to Premium → everything works
3. **Service worker cleared.**
   - DevTools → Application → Service Workers → confirm "montree-v2" or unregister + reload
4. **Brain update.** `CLAUDE.md` has a Session 76 entry at the top of RECENT STATUS.

---

## Don't break these (post-sweep)

- `maxDuration = 120` on `app/api/montree/photo-identification/process/route.ts`
- `HAIKU_TRUST_CONFIDENCE = 0.85` (Pass 2b discriminator threshold)
- Replan Stage 0 ordering in `weekly-wrap/route.ts` (replan MUST run before reports)
- Cross-pollination security: every route accepting `child_id` calls `verifyChildBelongsToSchool()`
- 173 files import via `lib/montree/i18n` barrel — don't change its public exports
- **Service worker MUST stay immutables-only.** If a future change adds HTML to the cache, the stale-shell-when-API-fails bug returns.
- **Every new Sonnet-calling route MUST tier-gate via `resolveReportModel()`** at the top after auth.
- **`I18nProvider` value MUST stay memoized.**
- **`enrichVisualMemoryFromCorrection()` is intentionally Free-tier-skipped** (moat-builder for paying schools only).

---

## Audit reference docs in repo

- `docs/AI_COST_AUDIT.md` — full report from the cost-audit agent, with line numbers for every Sonnet call
- `docs/I18N_REFACTOR_HANDOFF.md` — Session 75 i18n auto-derived SELECTs
- `docs/DARK_FOREST_REDESIGN_HANDOFF.md` — Phase 10 super-admin still pending
