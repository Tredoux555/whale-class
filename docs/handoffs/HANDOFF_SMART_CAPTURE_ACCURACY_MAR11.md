# Handoff: Smart Capture Accuracy Overhaul — Mar 11, 2026

## Summary

Full 3×3×3 deep-dive/plan/build process to fix Smart Capture (Photo Insight) work recognition accuracy. The system was misidentifying Montessori works (e.g., tagging "Eye Dropper" as "Folding Cloths") due to 5 root causes in the Sonnet vision prompt and matching pipeline.

## What Changed (7 files modified)

### 1. `app/api/montree/guru/photo-insight/route.ts` (~699 lines)

**8 surgical edits to fix work recognition:**

- **Full categorized curriculum hint** — Was `.slice(0, 15)` per area hiding 77% of works. Now sends ALL 329 works grouped by area → category → work names. Sonnet can see the entire curriculum.
- **Visual Identification Guide** — New ~55-line section in system prompt mapping specific tools/materials to work names (e.g., "Eye Dropper/Pipette → Eye Dropper", "Spoon → Spooning"). Covers Practical Life transfers, preliminary, care of environment, Sensorial, Mathematics, Language.
- **Confidence calibration guide** — Explicit ranges: 0.95+ unmistakable, 0.7-0.94 likely, 0.5-0.69 best guess, <0.5 cannot identify.
- **Debiased focus works** — Changed from "ALWAYS prefer these works" to "for context only — do NOT bias your identification".
- **Independent assessment for duplicates** — Changed from "use same work name" to "make your OWN independent assessment".
- **GREEN/AMBER/RED confidence zones:**
  - GREEN (≥0.95 match AND ≥0.95 confidence): Auto-update progress silently
  - AMBER (0.5–0.95): Tag photo but require teacher confirmation before progress update
  - RED (<0.5): Scenario A (unknown work)
- **Removed poisoned self-learning** — Auto-updates no longer mark accuracy EMA as "assumed correct". Accuracy data ONLY updated when teacher explicitly confirms or corrects.
- **`needs_confirmation`** added to all 3 response paths (main, fallback, cache).

### 2. `lib/montree/photo-insight-store.ts` (~244 lines)

- Added `needs_confirmation?: boolean` to `PhotoInsightResult` interface
- Added `needs_confirmation: data.needs_confirmation || false` to API response mapping
- Extended `InsightStatus` with `'confirmed' | 'rejected'`
- New `confirmEntry(mediaId)` and `rejectEntry(mediaId)` functions

### 3. `components/montree/guru/PhotoInsightButton.tsx` (~407 lines)

- **AMBER zone UI** — "Is this correct?" with ✓ Yes / ✗ Wrong buttons
- **`handleConfirm`** — Updates progress via `/api/montree/progress/update` + marks accuracy EMA correct via `/api/montree/guru/corrections` with `action: 'confirm'`
- **`handleReject`** — Opens "Teach Guru" correction modal via `onTeachWork` callback
- GREEN zone shows "✓ High confidence — progress auto-updated"
- Confirmed state shows "✓ Confirmed"

### 4. `app/api/montree/guru/corrections/route.ts`

- New `action: 'confirm'` branch — calls `update_work_accuracy` RPC with `p_was_correct: true`
- Returns early WITHOUT recording a correction entry (confirm ≠ correction)

### 5. `lib/montree/i18n/en.ts` + `zh.ts`

5 new keys each (perfect parity):
- `photoInsight.highConfidenceAutoUpdated`
- `photoInsight.pendingConfirmation`
- `photoInsight.confirmMatch`
- `photoInsight.wrongMatch`
- `photoInsight.confirmed`

## 14 Root Causes Identified → 10 Fixed

| # | Root Cause | Status |
|---|-----------|--------|
| 1 | `.slice(0,15)` hides 77% of curriculum | ✅ Full categorized curriculum |
| 2 | No visual descriptions for work identification | ✅ Visual Identification Guide |
| 3 | No aliases for PL works | Deprioritized (full curriculum sufficient) |
| 4 | "ALWAYS prefer" focus works bias | ✅ "Context only — do NOT bias" |
| 5 | Biased tool examples | ✅ Replaced with comprehensive visual guide |
| 6 | No category structure in curriculum hint | ✅ Grouped by area → category → works |
| 7 | Fuzzy matching post-identification | Architectural — acceptable |
| 8 | No visual features in matching layer | Mitigated by better Sonnet identification |
| 9 | Perfect-score wrong ID → silent corruption | ✅ GREEN zone (0.95) threshold |
| 10 | Poisoned feedback loop (assumed correct) | ✅ Only mark correct on teacher confirm |
| 11 | Migration 137 deployment uncertain | Noted — needs verification |
| 12 | Focus works tunnel vision | ✅ Debiased context |
| 13 | No "I'm not sure" escape for Sonnet | ✅ Confidence floor at 0.5 → scenario A |
| 14 | Duplicate context propagates errors | ✅ "Independent assessment" language |

## 3×3×3 Audit Results

### Deep Dive Phase (3 cycles): 14 root causes identified
### Plan Phase (3 cycles): 7-change implementation plan finalized
### Build Phase (3 cycles):
- Cycle 1 Audit: 4 issues (2 CRITICAL: store missing needs_confirmation mapping, corrections API marking confirms as incorrect)
- Cycle 2 Audit: 1 issue (misleading i18n text)
- Cycle 3 Audit: 1 issue (double check mark cosmetic)
- **Total: 6 issues found, all fixed**

## Deploy

⚠️ NOT YET PUSHED. Include in consolidated push. No new migrations needed.

**Dependency:** Migration 137 (`montree_guru_corrections` + `montree_work_accuracy` tables) must exist in production for the corrections/accuracy features to work. The confirm path has try/catch so it degrades gracefully if tables don't exist.

## Test Plan

1. Take a photo of a clearly identifiable work (Pink Tower, Spooning) → Should auto-update (GREEN zone)
2. Take a photo of a partially visible work → Should show "Is this correct?" (AMBER zone)
3. Click "Yes" on AMBER zone → Should update progress + mark accuracy as correct
4. Click "Wrong" on AMBER zone → Should open correction modal
5. Take a blurry/unclear photo → Should show Scenario A (unknown work)
6. Verify Eye Dropper is no longer misidentified as Folding Cloths
