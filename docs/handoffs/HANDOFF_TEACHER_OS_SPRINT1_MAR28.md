# Teacher OS Sprint 1 — Simplify Photo-Insight Route

**Date:** March 28, 2026
**Status:** ✅ COMPLETE — 3 audit cycles, Cycle 3 ALL CLEAN
**Migration:** 155 — NOT YET RUN (same as Sprint 0)
**Deploy:** ⚠️ NOT YET PUSHED

---

## What Was Built

### Sprint 1: Remove Haiku Verification from CLIP Path

**Core change:** When CLIP successfully identifies a Montessori work, the result is now returned directly to the client — no Haiku verification step. Teacher confirms/corrects via popup (Sprint 2).

**What was removed (lines 738-1054 of old code):**
- Haiku prompt construction + API call with `assess_mastery` tool
- `work_verified` check and `CLIP_OVERRIDE_BY_HAIKU` throw
- GREEN/AMBER/RED zone logic (`shouldAutoUpdate`, `needsConfirmation`)
- Auto-update progress on GREEN zone
- Auto-add to shelf on GREEN zone
- Full catch block for slim Haiku errors

**What replaced it (~130 lines, lines 738-903):**
- Direct classroom + shelf lookups from CLIP result
- Fire-and-forget media tagging (photo → work_id association)
- Onboarding visual memory bonus (CLIP confidence ≥ 0.80 + `photoUrl` guard)
- Interaction save with `classification_method: 'clip_direct'`
- Clean response with all backward compat fields

**Key response changes:**
| Field | Before (Sprint 0) | After (Sprint 1) |
|-------|-------------------|-------------------|
| `classification_method` | `'clip_enriched'` | `'clip_direct'` |
| `mastery_evidence` | Haiku-assessed string | always `null` |
| `auto_updated` | conditional (GREEN zone) | always `false` |
| `needs_confirmation` | conditional (AMBER zone) | always `true` |
| `confidence` | Haiku confidence | CLIP confidence |
| `suggested_crop` | Haiku crop suggestion | `null` |
| `insight` | Haiku observation | `"Identified: {workName}"` |

**What's preserved:**
- Two-pass Haiku pipeline as fallback when CLIP fails (untouched)
- Store v2 overrides backward compat fields based on its own logic (line 439-448)
- All fire-and-forget calls have `.catch()` handlers
- Offline queue + sync manager unaffected

**Cost impact:** $0.00 per CLIP-identified photo (was ~$0.0006 for slim Haiku call)

---

## Audit Summary

### Cycle 1 (3 parallel agents)
- Route: 1 CRITICAL (null guard style), 1 HIGH (photoUrl guard), 1 HIGH (fire-and-forget pattern)
- Store: 1 HIGH (correction scenario hardcode — pre-existing, not Sprint 1), 1 MEDIUM (classification_method not stored)
- Consumer: 1 CRITICAL (photo-audit zone logic hardcoded on needs_confirmation) — **FIXED**
- **Triaged**: photoUrl guard FIXED, photo-audit zone logic FIXED, others triaged as acceptable

### Cycle 2 (3 parallel agents)
- Route: 1 dead variable (clipClassroomId) — **CLEANED**
- Store: **CLEAN** ✅
- Consumer: 2 findings — both FALSE POSITIVES (store overrides API values)

### Cycle 3 (3 parallel agents)
- Route: **CLEAN** ✅
- Store: **CLEAN** ✅
- Consumer: **CLEAN** ✅

**Total fixes applied:** 4 across 2 cycles, then 3 consecutive CLEAN on Cycle 3.

---

## Files Modified (2)

1. `app/api/montree/guru/photo-insight/route.ts` — Replaced Haiku verification section (lines 738-1054) with CLIP direct return (~130 lines). Added photoUrl guard on onboarding bonus. Removed dead clipClassroomId variable.
2. `app/montree/dashboard/photo-audit/page.tsx` — Updated zone classification from needs_confirmation/auto_updated branching to work_name presence check (Sprint 1 compatible).

---

## Next Sprint: Sprint 2 — PhotoInsightPopup Component

Build the non-blocking popup that appears after CLIP identifies a work. Teacher sees work name + area badge + status buttons (Presented / Practicing / Mastered / Save). Replaces PhotoInsightButton's inline confirm/reject UI.

---

## Deploy Steps

1. Run migration: `psql $DATABASE_URL -f migrations/155_teacher_os_foundation.sql`
2. Push code to main
3. Railway auto-deploys
4. No env vars needed for Sprint 1
