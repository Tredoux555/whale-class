# Session 10 Handoff — Photo Audit Auto-Confirm Rails

**Date:** April 8, 2026
**Commits:** `6ed59ff3`, `f02ce923`, `e9e6e622`, `6cd1956c`, `353bc96a`, `83c4b00e`, `3894fad4`

## What shipped

1. **`6ed59ff3`** — Fix 500 "Delegation failed" on `/api/montree/photo-audit/resolve`. Internal `fetch()` to corrections route was throwing on Railway; replaced with in-process `correctionsPost(synthetic)` using synthetic `NextRequest` forwarding cookie/xff/ua.

2. **`f02ce923`** — Path B (new_custom) INSERT into `montree_classroom_curriculum_works` now seeds `parent_description`, `why_it_matters`, `key_materials` directly from cached `sonnet_draft` on `montree_media`. New custom works appear with full Sonnet descriptions immediately.

3. **`e9e6e622`** — ThisIsSheet one-tap "Add as new work" + raised `aiGuess` match threshold to 0.75 (was showing misleading "Cutting 45%" chips).

4. **`6cd1956c`** — Gate B (server) + Tier 1 (client) auto-confirm at ≥80% `closest_existing_match.similarity`. Photo gets `teacher_confirmed=true` and bypasses the audit queue.

5. **`353bc96a`** — Dropped non-existent `mode` column from `montree_guru_interactions` inserts at `guru/corrections/route.ts` lines 125, 417. Was spamming PGRST204 "non-fatal" errors on every confirm/correct.

6. **`83c4b00e`** — ThisIsSheet was a bottom-sheet that sized to content and left half the desktop window showing. Changed to centered modal: `alignItems: center`, `height: min(720px, 90vh)`, `borderRadius: 20`, `rgba(0,0,0,0.7)` backdrop. Guarded `captured_at` for "Invalid Date".

7. **`3894fad4`** — **Crown jewel.** Paper Work photo showed "82% Paper Work · Similar to Solar System (45%)" and Gate B/Tier 1 were bailing because they only looked at `closest_existing_match.similarity` (Haiku's stale 45%). But `sonnet_draft.proposed_name = "Paper Work"` at `draft.confidence = 0.82` and "Paper Work" IS an existing curriculum work. Fix: both Gate B and Tier 1 now try TWO candidates — (1) `closest_existing_match.work_name` if sim≥0.8, then (2) `proposed_name` if draft.confidence≥0.8. First one to resolve to a real classroom work wins. Server returns `via: 'closest_match' | 'proposed_name'`.

## Log lines to watch in Railway

- `[PhotoIdentification] GateB auto-confirm via closest_match: "X" 95% — bypassing Photo Audit`
- `[PhotoIdentification] GateB auto-confirm via proposed_name: "Paper Work" 82% — bypassing Photo Audit`
- `[ThisIsSheet] Tier 1a auto-attach: "X" 90% — skipping sheet`
- `[ThisIsSheet] Tier 1b auto-attach via proposed_name: "Paper Work" 82% — skipping sheet`

## Next session

1. **Verify Paper Work auto-confirm** after Railway redeploys `3894fad4`. The two "Paper Work 82%" cards should disappear on single tap of "This is…" (Tier 1b), or be gone entirely on a `force=true` background re-process through Gate B proposed_name path.

2. **Migration 165 gap** — audit found 164, 166, 167 but no 165. Run `ls migrations/ | grep '^165'`. If dropped, restore from git history.

3. **Gate B telemetry bucket** — 24–48h after deploy, grep Railway for `GateB auto-confirm via` and bucket `closest_match` vs `proposed_name`. Tune weights from data.

4. **Phase 2 Gate A threshold tune** (pending from Session 7) — grep `[PhotoIdentification] GateA` and bucket by `haikuConf`, `hasVM`, `vmSetSize` to pick a data-driven `HAIKU_TRUST_CONFIDENCE`.

5. **Monday Apr 13, 9am +08:00 — GMass Campaign A fire** (unchanged from earlier notes). Open Gmail → Drafts → "Montree", verify settings, ask user to click the red GMass button. Do NOT click Send autonomously.

## Known open issues

- **Migration 165 gap** (see above)
- **Legacy Fix flow** at `correctingPhoto` still bypasses the unified "This is…" sheet for non-sonnet-draft cards. Orthogonal. Fold in when convenient.
- **Stale `sonnet_draft` after Fix** edge case — Gate B only runs on insert, not on Fix, so a Fix'd photo with stale closest_existing_match can still show a misleading chip. Low priority.

## Files touched

- `app/api/montree/photo-audit/resolve/route.ts`
- `app/api/montree/photo-identification/process/route.ts`
- `app/api/montree/guru/corrections/route.ts`
- `app/montree/dashboard/photo-audit/page.tsx`
- `components/montree/photo-audit/ThisIsSheet.tsx`
- `lib/montree/photo-identification/enrich-custom-work.ts`
- `CLAUDE.md` (Session 10 entry)
