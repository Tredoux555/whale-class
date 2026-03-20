# Handoff: Smart Capture Debiasing + CLIP Resilience — Mar 20, 2026

## Summary

Fixed critical Smart Capture misidentification where "Sandpaper Letters" was being identified as "Grammar Boxes" — twice on the same child (Austin). Root cause: child's shelf works and recent progress were injected into the identification prompts, biasing Haiku toward works on the child's shelf. Also added CLIP cross-area fallback, visual memory boost safety, and init retry resilience.

## Root Cause Analysis

### The Misidentification

Austin's photo clearly showed pink/blue textured boards with individual raised letters — unmistakably Sandpaper Letters. But Smart Capture identified it as "Grammar Boxes" with high confidence. This happened TWICE.

### Why It Happened: Prompt Bias (2 sources)

**Source 1 — `worksContext` (30 recent works from `montree_child_progress`):**
- Injected into Pass 2 user message AND Sonnet fallback user message
- If Grammar Boxes was in Austin's recent progress, Haiku saw it as context and pattern-matched "textured letter boards" → Grammar Boxes
- This is like asking someone to identify an animal while showing them a list of animals they recently saw — they'll pick from the list

**Source 2 — `focusWorksContext` (child's current shelf works):**
- Injected into the system prompt for ALL identification passes
- If Grammar Boxes was on Austin's shelf, it appeared in the system prompt as a "current focus" — making Haiku think it was the most likely answer

### The Fix: Complete Debiasing

Both bias sources removed. Identification now runs on PURE visual evidence only:
- Pass 1 (describe): Sees the photo, describes physical materials
- Pass 2 (match): Matches description to curriculum using visual ID guide — NO child-specific context
- Sonnet fallback: Same — photo + curriculum only, no shelf/progress injection

The `focusWorksResult` query still runs (for post-identification `inChildShelf` checks) but its result is never injected into any prompt.

## Changes Made

### File 1: `app/api/montree/guru/photo-insight/route.ts` (5 edits)

1. **Line 669** — `worksContext` variable removed (was building 30-work progress context)
2. **Lines 816-822** — `focusWorksContext` processing block replaced with comment explaining intentional non-use
3. **Line 1177** — System prompt: removed `${focusWorksContext}` from prompt concatenation
4. **Lines 1290-1295** — Pass 2 user message: removed `${worksContext}`, added explicit instruction "Identify based ONLY on the physical materials described"
5. **Line 1348** — Sonnet fallback user message: removed `${worksContext}`, added "Identify based ONLY on the materials visible in the photo"

### File 2: `lib/montree/classifier/clip-classifier.ts` (3 edits)

1. **Cross-area fallback (lines 341-385)** — When within-area confidence < 0.70, searches ALL 329 works globally instead of being locked into the initial area classification. Prevents cascade failure where Stage 1 picks wrong area and correct work is never found.

2. **Visual memory boost safety (lines 446-467)** — Minimum base confidence of 0.60 required before applying +0.15 boost. Prevents weak CLIP matches (0.50) from being boosted above the 0.75 confident threshold, which would cause false positives to skip the two-pass pipeline entirely.

3. **`resetInitError()` export (lines 500-502)** — Allows orchestrator to clear cached initialization errors before retry attempts.

### File 3: `lib/montree/classifier/classify-orchestrator.ts` (3 edits)

1. **Import** (line 21) — Added `resetInitError` import
2. **Init retry tracking** (lines 39-46) — 5 state variables for TTL-based retry: `initAttempted`, `initFailed`, `initFailedAt`, `initAttemptCount`, `initPromise` + constants `INIT_RETRY_TTL_MS` (5 min), `INIT_MAX_ATTEMPTS` (3)
3. **TTL-based retry logic** (lines 84-123) — Three gates: permanent failure (≥3 attempts), cooldown (within 5 min TTL), then retry. Calls `resetInitError()` before retry. Atomic init lock via `||=` prevents double-init race condition.

### File 4: `lib/montree/classifier/index.ts` (1 edit)

- Added `resetInitError` to barrel exports (line 10)

## Commit

- **Hash:** `d0c9cdea`
- **Message:** "fix: Smart Capture debiasing + CLIP cross-area fallback + init resilience"
- **Stats:** 4 files changed, 127 insertions, 37 deletions
- **Deploy:** Railway commit `454dae34` — Active, Online at 17:18 GMT+8

## Verification

10x10x10x10 audit methodology — 5 waves of parallel research agents (8+ agents total), followed by a dedicated verification agent that checked all 4 files post-edit. Zero bugs found.

## What to Test

1. **Take a Sandpaper Letters photo** with Austin (or any child who has Grammar Boxes on their shelf) — should now correctly identify as "Sandpaper Letters"
2. **Check Railway logs** for `[CLIP]` entries — cross-area fallback will log when triggered
3. **Verify CLIP init** — if CLIP fails to initialize (e.g., OOM on Railway), it should retry after 5 minutes up to 3 times, then permanently fail (graceful fallback to two-pass)

## Remaining Dead Code

The `currentWorks` query (line ~664) still fetches 30 works from `montree_child_progress` but the result (`worksResult`) is no longer used in any prompt. It's dead code — safe to remove in a future cleanup, but harmless.

## Key Design Decision

**Why not inject shelf works at all?** Even as "context" or "hints", shelf works bias the model. The visual ID guide (262 lines) already contains comprehensive descriptions of ALL 329 works. The model doesn't need to know what's on the child's shelf to identify what's in the photo — it just needs to see the photo and match against the curriculum. Post-identification, we check if the identified work is on the shelf (for `inChildShelf` logic), but that check happens AFTER identification, not during.

---

## Follow-Up: Round 2 Debiasing (Same Session, Later)

### New Misidentification

Henry's photo showed Color Tablets (rigid colored wooden/plastic squares matched by color) but was identified as "Fabric Matching" (soft cloth swatches matched by texture). Same structural flaw as Sandpaper Letters → Grammar Boxes.

### Root Cause: Visual Memory Is ALSO a Bias Vector

The initial debiasing removed `worksContext` (child progress) and `focusWorksContext` (child shelf). But a THIRD bias source remained: `visualMemoryContext` — the "learned" descriptions from the `montree_visual_memory` table.

**How it poisons identification:**
1. Photo is wrongly identified as "Fabric Matching" (original misidentification)
2. Teacher doesn't correct it (or correction happens but visual memory entry persists)
3. "Fabric Matching" description in visual memory now includes "colored squares on mat"
4. Every future photo in this classroom gets that wrong description injected into the prompt
5. Haiku sees "colored squares" in the photo AND "colored squares" in the Fabric Matching memory → reinforces wrong answer

This is the **exact same bias pattern** as worksContext/focusWorksContext, just from a different source. Standard works already have comprehensive descriptions in the 262-line visual ID guide — injecting "learned" descriptions from possibly-wrong prior identifications only poisons the well.

### Three Fixes Applied (NOT YET PUSHED — ENOSPC)

**Fix 1 — Color Tablets vs Fabric Matching confusion pair (3 edits):**
- Strengthened Color Box description header: "Color Tablets are small WOODEN or PLASTIC rectangles — NOT fabric"
- Added catch-all line: "If you see colored SQUARES being matched by COLOR → Color Box, NOT Fabric Matching"
- Strengthened Fabric Matching description: "FABRIC swatches (soft, foldable CLOTH pieces — NOT rigid colored squares)... matched by TEXTURE with eyes closed"
- Added #1 confusion pair: "COLOR BOX (rigid WOODEN/PLASTIC painted squares matched by COLOR) vs FABRIC MATCHING (soft CLOTH swatches matched by TEXTURE — child FEELS with eyes closed)"

**Fix 2 — Visual memory debiasing (CRITICAL):**
- Standard work memories REMOVED from identification prompts entirely
- Only CUSTOM work memories (teacher-created, NOT in standard curriculum) are now injected
- Rationale: Standard works already have descriptions in the visual ID guide. Custom works have NO description in the guide and genuinely need memory injection.
- Fire-and-forget `increment_visual_memory_used` RPC narrowed to custom memories only
- Comment block explains the design decision for future developers

**Fix 3 — Pass 1 prompt strengthened:**
- Added "MATERIAL COMPOSITION" as the #1 priority focus: "What are the objects MADE OF? Be very specific: wood, metal, fabric/cloth, plastic..."
- Added "Are pieces RIGID (hard, stiff) or SOFT (foldable, flexible)?"
- Added "If colored pieces, specify: are they hard/rigid TABLETS or soft FABRIC swatches?"
- Added "ALWAYS state what the pieces are MADE OF" closing instruction
- This ensures Pass 1 captures the critical distinguishing feature (material type) that Pass 2 needs

### Files Modified (1)

1. `app/api/montree/guru/photo-insight/route.ts` — 7 edits total (5 from Round 1 + 3 from Round 2, some overlapping lines)

### Deploy

⚠️ NOT YET PUSHED — VM disk full (ENOSPC). User must push from Mac:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add app/api/montree/guru/photo-insight/route.ts docs/handoffs/HANDOFF_SMART_CAPTURE_DEBIASING_MAR20.md
git commit -m "fix: deepen Smart Capture debiasing — remove visual memory bias + Color Tablets confusion pair + material composition in Pass 1"
git push origin main
```

### Bias Sources Summary (All Three Now Removed)

| Bias Source | What It Was | When Removed |
|---|---|---|
| `worksContext` | 30 recent works from child progress | Round 1 (commit d0c9cdea) |
| `focusWorksContext` | Child's current shelf works | Round 1 (commit d0c9cdea) |
| `visualMemoryContext` (standard works) | "Learned" descriptions from prior photos | Round 2 (this fix, not yet pushed) |

Only `visualMemoryContext` for **custom works** (teacher-created, not in standard curriculum) is still injected — these genuinely need memory because they have no entry in the visual ID guide.

---

## Follow-Up: Photo Save Failure Investigation (Same Session, Later)

### Problem

User reported "photos are not being saved at all now" — critical production issue. Photos show "Photo saved!" toast (IndexedDB enqueue succeeds) but never appear in gallery (server upload fails silently in background). Gallery showed "1 photo waiting to upload" with orange progress bar and "Sync now" button.

### Investigation

**Full code audit of entire upload pipeline — zero code bugs found:**

1. `app/montree/dashboard/capture/page.tsx` — `doUploadAndAnalyze()`: compress → `enqueuePhoto()` → navigate → `syncQueue()` background. Correct.
2. `lib/montree/offline/sync-manager.ts` — `syncQueue()`, `uploadEntry()`, `enqueuePhoto()`, `checkNetworkReachable()`. All correct. Smart Filter `!entry.work_id` gate on `startAnalysis` is post-upload only.
3. `lib/montree/offline/queue-store.ts` — IndexedDB layer with private browsing guard, atomic `saveEntryAndBlob`. Correct.
4. `lib/montree/offline/sync-triggers.ts` — Registers visibility, online, periodic, initial sync triggers. Correct.
5. `app/api/montree/media/upload/route.ts` — Auth, validation, Supabase storage upload, DB record creation. Correct.
6. `app/api/montree/health/route.ts` — Simple 200 response, no auth required. Correct.
7. `app/montree/dashboard/layout.tsx` — `registerSyncTriggers()` called in useEffect. Correct.
8. `lib/montree/photo-insight-store.ts` — `startAnalysis()` is void/fire-and-forget, can't crash upload flow. Correct.
9. `lib/montree/offline/index.ts` — Barrel exports match all imports. Correct.

### Root Cause: Expired Auth Cookie

**Diagnosis confirmed by user screenshot:** Gallery showed "1 photo waiting to upload" with "Sync now" button — photo is in IndexedDB but background sync is failing.

The teacher's `montree-auth` httpOnly cookie was set with the OLD 7-day TTL (before the 365-day change was deployed). After 7 days, the cookie expired. The sync manager's `uploadEntry()` calls `fetch('/api/montree/media/upload')` — same-origin, cookies auto-sent — but the expired cookie returns 401. The sync manager detects this and marks the entry as failed, but there's no visible error to the teacher (fire-and-forget pattern).

**Fix:** Teacher needs to log out and log back in to get a fresh cookie with the new 365-day TTL.

### Diagnostic Endpoint Created

`app/api/montree/debug-upload/route.ts` — GET endpoint that tests:
1. Auth cookie validity (verifySchoolRequest)
2. Supabase DB connection (query montree_schools)
3. Supabase storage bucket access (list montree-media)
4. Recent media records (last 24h count + details)
5. Storage write test (1-byte file upload + delete)

Returns JSON with per-check status (OK/FAIL) + overall summary. Hit `montree.xyz/api/montree/debug-upload` while logged in to diagnose upload issues.

### Nav Icon Fix

`components/montree/DashboardHeader.tsx` — Changed Albums page icon from 📸 to 🖼️ to distinguish from Smart Capture camera icon. Two identical 📸 icons were confusing.

### Files Created (1)

1. `app/api/montree/debug-upload/route.ts` (~200 lines) — Temporary diagnostic endpoint (DELETE after issue resolved)

### Files Modified (1)

1. `components/montree/DashboardHeader.tsx` — Albums icon 📸 → 🖼️

### Deploy

⚠️ NOT YET PUSHED (ENOSPC). Push from Mac:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add app/api/montree/guru/photo-insight/route.ts app/api/montree/debug-upload/route.ts docs/handoffs/HANDOFF_SMART_CAPTURE_DEBIASING_MAR20.md CLAUDE.md components/montree/DashboardHeader.tsx
git commit -m "fix: deepen Smart Capture debiasing + photo upload diagnostic + nav icon fix"
git push origin main
```

### Key Lesson

When the auth cookie TTL is changed (e.g., 7d → 365d), the change only applies to NEW cookies issued after deployment. Existing cookies keep their original TTL. Teachers with old sessions will silently fail on uploads until they re-login.
