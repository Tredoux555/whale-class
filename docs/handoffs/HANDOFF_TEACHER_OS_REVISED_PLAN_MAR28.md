# Teacher Operating System — Revised Plan (Photo-First Flow)

**Date:** March 28, 2026
**Status:** AUDITED — 3 parallel audit agents (DB/Architecture, Teacher UX, Codebase Integration). Findings incorporated below.
**Base:** Evolved from 10x10 Plan v10-FINAL, with simplified capture-first interaction model

---

## Core Philosophy Change

**Before (10x10 plan):** Complex GREEN/AMBER/RED confidence zones with auto-update logic. System tries to decide for the teacher.

**After (this plan):** Teacher takes photo → CLIP identifies work (~300-800ms) → popup shows result → teacher picks status (Save / Presented / Practicing / Mastered). Teacher is always in control.

**Why:** Simpler, faster, more aligned with Montessori teacher sovereignty. Every photo gets a status. No more "untagged" photos. CLIP's ~80-90% accuracy is good enough when the teacher is confirming anyway.

---

## The Simplified Photo Flow (Core Interaction)

### Current Flow (Complex)
```
Photo → Upload → CLIP (~300ms) → Haiku verification (~2-5s) →
  GREEN zone: auto-update (teacher might not even notice)
  AMBER zone: confirm/reject buttons
  RED zone: untagged, teacher has to manually fix later
```

### New Flow (Simple)
```
Photo → Upload (3-8s on classroom WiFi) → CLIP (~300ms) → Popup:
  ┌─────────────────────────────────────────────┐
  │  📸 "Sandpaper Letters" (87% sure)          │
  │  [Area: Language]                           │
  │                                             │
  │  [Presented] [Practicing] [Mastered]        │
  │                                             │
  │  [Save for Later]           [Wrong? Fix →]        │
  └─────────────────────────────────────────────┘
```

**Popup behavior:** Non-blocking toast queue (like notifications). Teacher can keep taking photos — popups stack and persist until tapped. Each popup has the photo thumbnail so teacher remembers which child/work it refers to. **Max 5 visible at once** — additional popups collapse into "N more pending" expandable footer. Same-work photos within 2 minutes group into a single popup ("3× Sandpaper Letters") with batch status button.

### Flow Details

**Happy path (~85-90% of photos, 4-10 seconds total):**
1. Teacher takes photo of child doing work
2. Photo saves to IndexedDB immediately (existing offline queue) — "Photo saved!" toast
3. Teacher can immediately take next photo (non-blocking)
4. Background: upload to server (3-8s on classroom WiFi, 3 parallel uploads)
5. Background: CLIP classifies in ~300-800ms server-side (first call after deploy: ~50-100s cold start, see note below)
6. Result pushed to photo-insight store
7. **PhotoInsightPopup** appears as persistent toast notification:
   - Shows photo thumbnail + identified work name + area badge + confidence %
   - 3 status buttons: **Presented** / **Practicing** / **Mastered**
   - "Just Tag" link (tag photo to work but no progress update)
   - "Wrong? Fix →" button (opens WorkWheelPicker for correction)
   - Teacher taps one button → done, toast dismissed
8. Progress updated, photo tagged

**CLIP cold start note:** First classification after a Railway container restart takes ~50-100s (model download + embedding precomputation). Subsequent classifications are 300-800ms. Container warmup via GET /api/montree/health on deploy mitigates this.

**Correction path (~10-15% of photos, 2 taps):**
1. CLIP gets it wrong
2. Teacher taps "Wrong? Fix →" (prominent button, not buried link)
3. WorkWheelPicker opens (existing component, has cross-area search)
4. Teacher picks correct work → same 3 status buttons appear
5. Correction feeds back into CLIP learning (existing visual memory system)

**No-match path (~5% of photos, confidence < 0.40):**
1. CLIP confidence too low to suggest anything
2. Popup shows: "I'm not sure what this is — help me tag it" with WorkWheelPicker directly
3. Teacher picks work + status
4. If it's a new custom work, "Add as new work" option (existing auto-propose system)

### What We Remove
- **Haiku verification step** — unnecessary when teacher confirms (saves ~$0.0006/photo and 2-5s latency)
- **GREEN/AMBER/RED zone logic** — replaced by always-show popup
- **Auto-update without teacher seeing** — every status change is teacher-initiated
- **Complex scenario A/B/C/D branching** — simplified to: identified / wrong / unknown

### What We Keep
- **CLIP classifier** — fast, free, good enough for suggestions
- **Visual memory system** — corrections still improve future accuracy
- **Offline queue** — photos safe in IndexedDB before upload
- **WorkWheelPicker** — for corrections, already has cross-area search
- **Custom work proposals** — when CLIP can't match at all

### What We Must Carefully Migrate (Audit Findings)

**Photo-Audit Page (CRITICAL):** The existing photo-audit page (`/montree/dashboard/photo-audit/page.tsx`) categorizes photos into GREEN/AMBER/RED zones using `auto_updated` and `needs_confirmation` fields. Removing these fields breaks the entire audit page.

**Migration plan:** Replace zone system with confidence-based categories:
- **Confirmed** = teacher picked a status via popup (new)
- **Auto-tagged** = CLIP identified but teacher hasn't confirmed yet
- **Untagged** = CLIP couldn't identify, no teacher action yet
- **Corrected** = teacher changed CLIP's suggestion

This is cleaner than the old zone system and gives teachers better information.

**PhotoInsightButton consumers (2 files):** Gallery page and progress page both import PhotoInsightButton with `onProgressUpdate` callback. Must rewire to fire on teacher's popup confirmation instead of auto-update.

**Conference Notes vs Teacher Notes:** `montree_teacher_notes` (classroom-wide general notes) already exists. New `montree_conference_notes` is per-child, parent-visible, with versioning. These are intentionally different systems — teacher notes are internal scratchpad, conference notes are formal parent communication. UI must make this distinction clear.

---

## The Rest of the Teacher OS (Unchanged from 10x10 Plan)

### 1. Automatic Attendance (Zero Effort)

**No separate attendance step.** Attendance is derived automatically from photo activity. If a child has at least one photo logged today, they're present. Teachers never tap an attendance button — they just take photos as usual.

- `montree_attendance_view` (SQL view) — Derives daily attendance from `montree_media.captured_at` (NOT `created_at` — uses actual photo timestamp, not upload time) grouped by child + DATE(captured_at AT TIME ZONE school.timezone)
- `GET /api/montree/attendance/today` — Returns derived attendance for dashboard display
- Absent children = no photos today. Dashboard shows "not yet seen" children at top of class list with a small "Mark Present" tap target (for children who arrived but haven't been photographed yet, e.g., during morning circle)
- Streaks calculated from consecutive days with photo activity
- Manual "Mark Present" creates a lightweight `montree_attendance_override` record (child_id, date, marked_by) — view UNIONs overrides with photo-derived presence

**Why this is better:** One less thing for the teacher to do every morning. Attendance tracking is invisible — it just happens as a side effect of the core photo workflow. Manual override handles edge cases (child present but no photo yet).

### 2. Stale Work Detection (Intelligence)

Works that haven't been touched in a while get flagged:
- **Cooling off** (7 days) — 🟢 normal, no alert
- **Getting stale** (14 days) — 🟡 gentle nudge
- **Needs attention** (21 days) — 🔴 teacher should look at this

Thresholds configurable per school. Teachers can dismiss alerts.

**DB:** `montree_stale_works_view` (SQL view on existing `montree_child_progress`)
- `GET /api/montree/intelligence/stale-works` — Stale works for classroom
- `POST /api/montree/intelligence/dismiss` — Dismiss alert
- `StaleWorksPanel` component — Dashboard panel with color-coded list

### 3. Conference Notes (Teacher ↔ Parent Communication)

Teachers write notes about a child → save as draft → share with parent → parent sees read-only view. Can retract if shared by mistake. Version history for audit trail.

3 states: **draft** → **shared** → **retracted**

**DB:** `montree_conference_notes` + `montree_conference_note_versions` (new tables)
- `GET/POST /api/montree/conference-notes` — CRUD for teacher
- `PATCH /api/montree/conference-notes/[id]` — Share/retract
- `GET /api/montree/parent/conference-notes` — Parent read-only view
- `ConferenceNoteEditor` — Rich text with draft/share/retract
- `ConferenceNoteParentView` — Read-only with retraction banner
- `OrphanDraftNudge` — Amber banner for unsent drafts

### 4. Weekly Pulse (Batch Processing)

Once a week, teacher hits "Generate Pulse" → system crunches through every child's data (photos, progress, observations) and surfaces what matters. Client-driven batches of 3 children at a time (Railway 30s timeout constraint).

**DB:** `montree_pulse_lock` (new table — prevents concurrent generation)
- `POST /api/montree/pulse/start` — Acquire lock, get child list
- `POST /api/montree/pulse/generate-batch` — Process 3 children (25s limit)
- `POST /api/montree/pulse/complete` — Release lock, finalize
- `GET /api/montree/pulse/status` — Check progress
- `PulseProgressModal` — Real-time progress bar
- Resume via IndexedDB if interrupted

### 5. Shelf Suggestions (Planning)

System looks at what a child has mastered + prerequisites → suggests what to put on their shelf next. Area balance considered.

- `GET /api/montree/planning/shelf-suggestions` — AI-generated suggestions
- `GET /api/montree/planning/weekly-summary` — Weekly summary data
- `ShelfSuggestionCard` — Suggestion with one-tap add to shelf

### 6. Mastery Session Log

When teacher marks works as mastered throughout the day, they accumulate in a session log. Persistent toasts (don't auto-dismiss). "Update All Pending" button for batch confirmation with confirmation dialog.

- `MasteryToast` — Persistent mastery confirmation
- `MasterySessionLog` — Collapsible log with batch update
- `ObservationQuickEntry` — Rapid observation recording

---

## Database Changes

### 3 New Tables
1. `montree_pulse_lock` — One per classroom, prevents concurrent pulse generation
2. `montree_conference_notes` — Teacher↔parent notes with versioning
3. `montree_conference_note_versions` — Audit trail for note edits

### 2 New Views
- `montree_stale_works_view` — Reads from existing `montree_child_progress`, calculates days since update
- `montree_attendance_view` — Derives daily attendance from `montree_media.captured_at` (timezone-aware via school settings) grouped by (child_id, date). UNIONs with `montree_attendance_override` for manual mark-present. A child with ≥1 photo OR manual override on a given day = present.

### New Columns (14)
On `montree_schools.settings` JSONB: `timezone`, `staleness_thresholds`, `pulse_enabled`
On `montree_teachers.settings` JSONB: `icon_labels_preference`, `icon_sessions_count`
On `montree_child_progress`: `evidence_photo_count`, `evidence_photo_days`, `last_observation_at`, `mastery_confirmed_at`, `mastery_confirmed_by`

### 12 New Indexes
(Same as 10x10 plan — see original handoff for full list)

### 15 RPCs
(Same as 10x10 plan — acquire_pulse_lock, increment_pulse_progress, etc.)

---

## What Changes in Existing Code

### `app/api/montree/guru/photo-insight/route.ts`
- Remove Haiku verification step for the popup flow
- CLIP result returned directly to client with `work_name`, `area`, `confidence`
- Keep Haiku as optional enrichment for observation text (fire-and-forget, non-blocking)
- Keep visual memory learning on corrections

### `components/montree/guru/PhotoInsightButton.tsx` → Replaced by `PhotoInsightPopup.tsx`
- Simplified: always shows popup with work suggestion + 4 status buttons
- Remove GREEN/AMBER/RED zone logic
- Remove scenario A/B/C/D branching
- Add "Not this? Search works..." link → opens WorkWheelPicker
- Add "What work is this?" for no-match case

### `lib/montree/photo-insight-store.ts`
- Simplify states: `analyzing` → `identified` | `no_match` | `error`
- Remove `needs_confirmation`, `auto_updated` fields
- Add `teacher_status_choice` field (save/presented/practicing/mastered)

### `app/montree/dashboard/capture/page.tsx`
- After photo taken + uploaded + CLIP returns, show PhotoInsightPopup inline
- Teacher picks status before moving to next photo (or can skip for later)

---

## Build Order

### Phase A: Photo-First Flow (Sprints 0-3) — THE CORE
| Sprint | What | Est. |
|--------|------|------|
| 0 | Migration: DDL + backfill (tables, columns, indexes) | 1.5h |
| 1 | Simplify photo-insight route (remove Haiku verification, return CLIP direct) | 2h |
| 2 | Build PhotoInsightPopup component (replace PhotoInsightButton) | 3h |
| 3 | Wire into capture page + gallery (popup after every photo) | 2h |

### Phase B: Automatic Attendance + Intelligence (Sprints 4-6)
| Sprint | What | Est. |
|--------|------|------|
| 4 | Attendance SQL view (derived from photos) + GET API + dashboard widget | 1h |
| 5 | Stale works view + API + StaleWorksPanel | 2h |
| 6 | Trend data + TrendChart + dismissal system | 2h |

### Phase C: Communication (Sprints 7-9)
| Sprint | What | Est. |
|--------|------|------|
| 7 | Conference notes tables + API (CRUD) + ConferenceNoteEditor | 3h |
| 8 | Parent view + 5-min SWR cache + retraction | 2h |
| 9 | OrphanDraftNudge + parent question urgency | 2h |

### Phase D: Pulse + Planning (Sprints 10-13)
| Sprint | What | Est. |
|--------|------|------|
| 10 | Pulse lock + RPCs + start/generate-batch/complete APIs | 3h |
| 11 | Client pulse orchestrator (IndexedDB resume, sequential batches) | 3h |
| 12 | PulseProgressModal + shelf suggestions API | 2h |
| 13 | Weekly summary + planning view | 2h |

### Phase E: Mastery Log + Admin (Sprints 14-16)
| Sprint | What | Est. |
|--------|------|------|
| 14 | MasteryToast + MasterySessionLog + ObservationQuickEntry | 3h |
| 15 | AutomationDashboard + pulse-dashboard API | 2h |
| 16 | Admin settings (staleness thresholds, pulse toggle) | 1h |

**Total: ~35 hours across 17 sprints**

---

## 12 Core Principles (Updated)

1. **Photo-first, teacher-confirms** — CLIP suggests, teacher always picks status. No auto-updates without teacher tap.
2. **Attendance is automatic** — Derived from photo activity. No separate attendance step. If a child has a photo today, they're present.
3. **IndexedDB + volatile fallback** — Dual-layer resume for pulse. iOS Safari PWA kills background tabs.
4. **Separate DDL from backfill** — Don't hold PgBouncer connections during data migration.
5. **Timezone in all date logic** — Every getMonday() uses school timezone. Never UTC for user-facing dates.
6. **Atomic DB increments** — No read-modify-write. Use DB-side += via RPC.
7. **ON CONFLICT + depth guard** — Handles concurrent INSERT races with bounded retry (max 2).
8. **Sequential client batches** — Client awaits each batch for pulse; DB sequence guard is safety net.
9. **Persistent mastery toasts + session log** — No auto-dismiss. Teacher sovereignty.
10. **Scoped dedup** — Per (child_id, work_name, 5-min window), not global.
11. **3 states for conference notes** — draft → shared → retracted (with orphan draft nudge).
12. **Days, not percentages** — Staleness uses configurable day thresholds (7/14/21).

---

## Pre-Implementation Items (from 10x10 audit + this audit + 3-agent audit)

1. **Mastery batch button confirmation** — "Update N works to Mastered? This cannot be undone." Atomic per child — all succeed or all fail.
2. **Container warmup** — GET /api/montree/health before Pulse loop starts. Also warms CLIP model. If CLIP init takes >10s, fall back to WorkWheelPicker with "AI starting up" toast.
3. **getMondayInTimezone DST tests** — Unit tests for DST boundary transitions.
4. **CLIP confidence floor wired into PhotoInsightPopup** — Below 0.40: show WorkWheelPicker directly, no suggestion. 0.40-0.60: show suggestion but "Wrong? Fix →" is 2× larger than status buttons. Above 0.60: normal layout with suggestion as primary.
5. **Add `idb` to package.json** — Currently a transitive dependency only. Add explicitly: `npm install idb --save`
6. **Photo-audit page migration (BLOCKING)** — Must redesign zone API (`/api/montree/audit/photos?zone=`) BEFORE removing auto_updated/needs_confirmation fields. New API accepts `?category=confirmed|auto_tagged|untagged|corrected`. Migration: GREEN → Confirmed, AMBER → Auto-tagged, RED → Untagged. See migration plan above.
7. **Popup as non-blocking toast queue** — NOT modal. Max 5 visible, overflow collapses. Same-work grouping within 2-min window. Persist until tapped.
8. **PhotoInsightPopup callback adapter** — New component must expose `onStatusPicked(mediaId, childId, status, workName)` callback. Parent pages (gallery, progress, capture) rewire from old `onProgressUpdate` to new callback. Custom work proposal flow preserved via "Add as new work" option in no-match path.
9. **photo-insight-store v2 migration** — New InsightStatus: `'analyzing' | 'identified' | 'no_match' | 'error'`. New field: `teacher_status_choice`. Remove: `auto_updated`, `needs_confirmation`, `scenario`. Adapter layer during transition: old status `'done'` maps to `'identified'`.
10. **CLIP failure/timeout fallback** — If CLIP errors or takes >5s, fall back to WorkWheelPicker with toast: "AI was slow — pick the work manually." If photo upload fails 3×, show "Check WiFi and retry" with Retry button.

---

## What NOT to Change

- `montree_child_progress` uses `work_name` (not work_id) — don't change
- `montree_media` has NO `work_name` column — uses `work_id` (UUID FK)
- `montree_child_focus_works` UNIQUE is (child_id, area) — one focus per area
- Teacher sovereignty — system SUGGESTS, teacher DECIDES
- Flat cascade — handleProgressChange never triggers further progress changes
- Existing WorkWheelPicker — reuse for corrections, don't rebuild

---

**END OF REVISED PLAN**
