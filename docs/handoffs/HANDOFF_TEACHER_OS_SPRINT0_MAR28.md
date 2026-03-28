# Teacher OS Sprint 0 — Foundation Build

**Date:** March 28, 2026
**Status:** ✅ COMPLETE — 3 audit cycles, 3 consecutive CLEAN on Cycle 3
**Migration:** 155 — NOT YET RUN (safe to run, fully idempotent)
**Deploy:** ⚠️ NOT YET PUSHED

---

## What Was Built

### Sprint 0: Migration DDL + Store v2 Rewrite

**1. Migration 155 — Teacher OS Foundation (`migrations/155_teacher_os_foundation.sql`, 240 lines)**

Creates all database objects for the Teacher OS system:

- **`montree_attendance_override`** — Manual "Mark Present" table (child_id, school_id, attendance_date, marked_by). UNIQUE on (child_id, attendance_date).
- **`montree_attendance_view`** — SQL view deriving attendance from photos (`montree_media.captured_at`) + manual overrides. Timezone-aware via school settings JSONB (`Asia/Shanghai` fallback). FULL OUTER JOIN merges photo-based and manual presence.
- **`montree_stale_works_view`** — Identifies works in 'presented'/'practicing' status not updated for 7+ days.
- **Evidence columns on `montree_child_progress`** — `evidence_photo_count`, `evidence_photo_days`, `last_observation_at`, `mastery_confirmed_at`, `mastery_confirmed_by`
- **`montree_pulse_lock`** — Prevents concurrent Pulse report generation per classroom. 30-minute timeout for stale locks.
- **`montree_conference_notes`** + **`montree_conference_note_versions`** — Draft/shared/retracted conference notes with version history.
- **`montree_stale_work_dismissals`** — Teacher can dismiss stale work alerts. UNIQUE on (child_id, work_name).
- **4 RPCs:** `acquire_pulse_lock`, `increment_pulse_progress`, `complete_pulse_lock`, `increment_evidence_photo`
- **Trigger:** `tr_conference_notes_updated_at` for auto-updating `updated_at`

All DDL uses `IF NOT EXISTS` / `CREATE OR REPLACE` — safe to run multiple times.

**2. Store v2 Rewrite (`lib/montree/photo-insight-store.ts`, ~720 lines)**

Complete rewrite for the Teacher OS photo-first flow:

- **InsightStatus simplified:** `'analyzing' | 'identified' | 'no_match' | 'error'` (removed `'done'`, `'confirmed'`, `'rejected'`)
- **Internal 'retrying' state** hidden from public API (exposed as `'analyzing'` via `toPublicStatus()`)
- **TeacherStatusChoice:** `'save' | 'presented' | 'practicing' | 'mastered'` — set via popup, NOT auto-updated
- **Confidence threshold:** `NO_MATCH_CONFIDENCE_THRESHOLD = 0.40` — below this, CLIP result treated as `no_match`
- **Composite key:** `mediaId:childId` for group photo correctness
- **getOriginalWorkData():** New getter for corrections flow (returns work_name, area, confidence)
- **Backward compatibility:** `auto_updated`, `needs_confirmation`, `scenario` fields on `PhotoInsightResult` populated in ALL code paths (response handler + correction handler) for existing consumers during migration
- **Deprecated adapters:** `confirmEntry()` → `setTeacherStatusChoice('save')`, `rejectEntry()` → `resetEntry()`

**3. Dependency Addition (`package.json`)**

Added `"idb": "^8.0.1"` to dependencies (was only transitive, now explicit for Teacher OS IndexedDB usage).

---

## Audit Summary

### Cycle 1 (3 parallel agents)
- DB/Migration: CLEAN
- Store v2: 5 CRITICAL, 3 HIGH, 3 MEDIUM, 2 LOW — **Triaged**: 3 real bugs fixed (backward compat fields, errorType clearing, getOriginalWorkData)
- Consumer Compat: 5 breaking changes found — **Fixed** by adding backward compat fields to PhotoInsightResult

### Cycle 2 (3 parallel agents)
- DB/Migration: CLEAN
- Store v2: 3 CRITICAL, 2 HIGH, 4 MEDIUM, 2 LOW — **Fixed**: AbortController cleanup in evictStale, custom_work_proposal + confidence in correction fallback, threshold bypass documented
- Consumer Compat: CLEAN

### Cycle 3 (3 parallel agents)
- DB/Migration: **CLEAN** ✅
- Store v2: **CLEAN** ✅
- Consumer Compat: **CLEAN** ✅

**Total fixes applied:** 6 across 2 cycles, then 3 consecutive CLEAN.

---

## Files Created (1)
1. `migrations/155_teacher_os_foundation.sql` — 240 lines, all Teacher OS foundation DDL

## Files Modified (2)
1. `lib/montree/photo-insight-store.ts` — Complete v2 rewrite (~720 lines)
2. `package.json` — Added `idb` dependency

---

## Next Sprint: Sprint 1 — Simplify photo-insight route

Remove Haiku verification from the CLIP pipeline — return CLIP results directly to the client. The store v2 is ready to receive simplified responses.

---

## Deploy Steps

1. Run migration: `psql $DATABASE_URL -f migrations/155_teacher_os_foundation.sql`
2. Push code to main
3. Railway auto-deploys
4. No env vars needed for Sprint 0
