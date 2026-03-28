# Handoff: Teacher Operating System — 10x10 Plan Build

**Date:** March 28, 2026
**Status:** READY TO BUILD — Plan v10-FINAL approved after 10 audit cycles, ~332 findings, 30 independent audit agents
**Priority:** This is the core fundamental operating system — the purpose of the Montree app

---

## What This Is

A comprehensive Teacher Operating System for Montessori classrooms. Automates the repetitive operational work (attendance, progress tracking, observation logging, staleness detection, parent communication, weekly planning) so teachers can focus on children.

Built through 10x10 methodology: 10 plan-audit cycles with 3 parallel audit agents each (A: DB/Concurrency, B: Teacher UX/Montessori, C: Architecture/Serverless). ~332 findings triaged and incorporated.

---

## Pre-Implementation Items (from Audit Cycle 10 Validation)

These 4 items were flagged during the final validation pass. Apply during build:

1. **Mastery batch button confirmation** — Add confirmation dialog to "Update All Pending" button in the MasterySessionLog component. "Update 4 works to Mastered? This cannot be undone. [Confirm] [Cancel]"

2. **Urgency keyword tuning** — Move "immediately" and "right now" from high-confidence to low-confidence tier. Remove "medicine" entirely (too many false positives — "Montessori medicine cabinet" is a practical life work).

3. **Container warmup** — Before starting Pulse loop, fire a GET to `/api/montree/health` to warm Railway container. Prevents first batch hitting a cold start + 25s timeout.

4. **getMondayInTimezone DST tests** — Add unit tests for DST boundary transitions (US spring forward, fall back, and a timezone that doesn't observe DST like Asia/Shanghai).

---

## Architecture Constraints (Railway Serverless)

- **No persistent workers, no cron daemon, no event bus**
- **30-second request timeout** (Railway default)
- **Client-driven incremental processing** — Browser orchestrates sequential batch API calls (3 children per call ≈ 18s each) because Railway can't hold 180s connections
- **25-second batch hard limit** — AbortController before Railway's 30s timeout
- **PgBouncer connection pooling** — Don't hold connections during long operations. Separate DDL from backfill migrations.
- **Fire-and-forget is fine** — Use `.catch()` handlers, never leave promises dangling

---

## 12 Core Principles

1. **IndexedDB + volatile fallback** — Dual-layer resume: persistent (IndexedDB) + volatile (in-memory module variable). iOS Safari PWA kills background tabs.
2. **Separate DDL from backfill** — Don't hold PgBouncer connections during data migration. Backfills run separately, idempotently.
3. **Timezone in all date logic** — Every `getMonday()` and `DATE()` uses school timezone via `Intl.DateTimeFormat`. Never UTC for user-facing dates.
4. **Atomic DB increments** — No read-modify-write patterns for counters. Use DB-side `+=` via RPC.
5. **ON CONFLICT + depth guard** — Handles concurrent INSERT races with bounded retry (max 2).
6. **Sequential client batches** — Client awaits each batch; DB sequence guard is safety net, not primary ordering.
7. **Single atomic UPDATE** — Progress + heartbeat in one UPDATE (no split UPDATEs).
8. **Persistent mastery toasts + session log** — No auto-dismiss for mastery events. Teacher sovereignty.
9. **Scoped dedup** — Per (child_id, work_name, 5-min window), not global session counter.
10. **3 states, not 4** — Conference notes: draft → shared → retracted (with orphan draft nudge).
11. **Days, not percentages** — Staleness uses configurable day thresholds (7/14/21 default).
12. **25-second batch limit** — Hard ceiling with AbortController before Railway timeout.

---

## Database Context (Existing Tables)

Key tables the build touches or reads from:

| Table | Notes |
|-------|-------|
| `montree_schools` | Has `settings` JSONB — will add `timezone`, `staleness_thresholds` |
| `montree_classrooms` | FK to school |
| `montree_children` | Has `school_id`, FK to classroom |
| `montree_teachers` | Has `settings` JSONB — will add `icon_labels_preference` |
| `montree_child_progress` | Uses `work_name` (NOT work_id). Status: presented/practicing/mastered |
| `montree_child_focus_works` | UNIQUE on (child_id, area). One focus per area per child |
| `montree_media` | Has `work_id` (UUID FK), `captured_at`, `child_id`. NO `work_name` column |
| `montree_media_children` | Junction for group photos. Links media to multiple children |
| `montree_guru_interactions` | AI conversation history |
| `montree_behavioral_observations` | Teacher observations |

---

## New Database Objects

### 3 New Tables

```sql
-- 1. Pulse lock (one per classroom, prevents concurrent pulse generation)
CREATE TABLE montree_pulse_lock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id),
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id),
  locked_by_api_call_id TEXT NOT NULL,
  progress JSONB DEFAULT '{"children_completed": 0, "children_failed": 0, "children_total": 0, "batch_sequence": 0}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, classroom_id)
);

-- 2. Conference notes (teacher↔parent communication with versioning)
CREATE TABLE montree_conference_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id),
  child_id UUID NOT NULL REFERENCES montree_children(id),
  teacher_id UUID NOT NULL REFERENCES montree_teachers(id),
  current_version INT DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'shared', 'retracted')),
  content TEXT NOT NULL,
  shared_at TIMESTAMPTZ,
  retracted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Conference note versions (audit trail)
CREATE TABLE montree_conference_note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES montree_conference_notes(id) ON DELETE CASCADE,
  version INT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(note_id, version)
);
```

### 1 New View

```sql
CREATE VIEW montree_stale_works_view AS
SELECT
  cp.child_id,
  cp.work_name,
  cp.area,
  cp.status,
  cp.updated_at AS last_progress_update,
  EXTRACT(DAY FROM NOW() - cp.updated_at) AS days_since_update,
  c.school_id,
  c.classroom_id
FROM montree_child_progress cp
JOIN montree_children c ON cp.child_id = c.id
WHERE cp.status IN ('presented', 'practicing');
```

### Column Modifications (16)

On `montree_schools.settings` JSONB:
- `timezone` (TEXT, default 'UTC')
- `staleness_thresholds` (JSONB: `{cooling_off_days, getting_stale_days, needs_attention_days}`)
- `pulse_enabled` (BOOLEAN)

On `montree_teachers.settings` JSONB:
- `icon_labels_preference` (TEXT: 'always'|'auto'|'never')
- `icon_sessions_count` (INT)

On `montree_child_progress`:
- `evidence_photo_count` (INT DEFAULT 0) — denormalized for fast reads
- `evidence_photo_days` (INT DEFAULT 0) — distinct days with photos
- `last_observation_at` (TIMESTAMPTZ)
- `mastery_confirmed_at` (TIMESTAMPTZ)
- `mastery_confirmed_by` (UUID)

On `montree_children`:
- `attendance_streak` (INT DEFAULT 0)
- `last_attendance_date` (DATE)

### 12 New Indexes

```sql
CREATE INDEX idx_pulse_lock_school_classroom ON montree_pulse_lock(school_id, classroom_id);
CREATE INDEX idx_pulse_lock_expires ON montree_pulse_lock(expires_at);
CREATE INDEX idx_conference_notes_child ON montree_conference_notes(child_id, status);
CREATE INDEX idx_conference_notes_teacher ON montree_conference_notes(teacher_id);
CREATE INDEX idx_conference_versions_note ON montree_conference_note_versions(note_id, version);
CREATE INDEX idx_progress_staleness ON montree_child_progress(child_id, status, updated_at) WHERE status IN ('presented', 'practicing');
CREATE INDEX idx_progress_evidence ON montree_child_progress(child_id, work_name, evidence_photo_count);
CREATE INDEX idx_media_work_child ON montree_media(child_id, work_id, captured_at) WHERE work_id IS NOT NULL;
CREATE INDEX idx_media_children_child ON montree_media_children(child_id);
CREATE INDEX idx_children_attendance ON montree_children(classroom_id, last_attendance_date);
CREATE INDEX idx_observations_child_recent ON montree_behavioral_observations(child_id, created_at DESC);
CREATE INDEX idx_children_classroom_school ON montree_children(classroom_id, school_id);
```

---

## 15 RPCs (Key Ones with Full Code)

### acquire_pulse_lock (with recursion depth guard)

```sql
CREATE OR REPLACE FUNCTION acquire_pulse_lock(
  p_school_id UUID, p_classroom_id UUID,
  p_call_id TEXT, p_lock_duration_minutes INT DEFAULT 15,
  p_retry_depth INT DEFAULT 0
) RETURNS TABLE (lock_id UUID, is_new_lock BOOLEAN) AS $$
DECLARE v_lock_id UUID;
BEGIN
  IF p_retry_depth > 2 THEN
    RAISE EXCEPTION 'acquire_pulse_lock: concurrent contention exceeded 2 retries';
  END IF;
  DELETE FROM montree_pulse_lock
  WHERE school_id = p_school_id AND classroom_id = p_classroom_id
    AND expires_at < NOW();
  INSERT INTO montree_pulse_lock (school_id, classroom_id, locked_by_api_call_id, expires_at)
  VALUES (p_school_id, p_classroom_id, p_call_id,
          NOW() + (p_lock_duration_minutes || ' minutes')::INTERVAL)
  ON CONFLICT (school_id, classroom_id) DO NOTHING
  RETURNING id INTO v_lock_id;
  IF v_lock_id IS NOT NULL THEN
    RETURN QUERY SELECT v_lock_id, TRUE;
    RETURN;
  END IF;
  SELECT id INTO v_lock_id
  FROM montree_pulse_lock
  WHERE school_id = p_school_id AND classroom_id = p_classroom_id
    AND expires_at >= NOW();
  IF v_lock_id IS NOT NULL THEN
    RETURN QUERY SELECT v_lock_id, FALSE;
  ELSE
    RETURN QUERY SELECT * FROM acquire_pulse_lock(
      p_school_id, p_classroom_id, p_call_id, p_lock_duration_minutes,
      p_retry_depth + 1
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### increment_pulse_progress (atomic progress + heartbeat)

```sql
CREATE OR REPLACE FUNCTION increment_pulse_progress(
  p_lock_id UUID, p_completed_delta INT,
  p_failed_delta INT DEFAULT 0, p_batch_sequence INT DEFAULT 0
) RETURNS TABLE (
  children_completed INT, children_failed INT, children_total INT
) AS $$
BEGIN
  RETURN QUERY
  UPDATE montree_pulse_lock
  SET
    progress = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(progress,
            '{children_completed}',
            to_jsonb(COALESCE((progress->>'children_completed')::INT, 0) + p_completed_delta)
          ),
          '{children_failed}',
          to_jsonb(COALESCE((progress->>'children_failed')::INT, 0) + p_failed_delta)
        ),
        '{batch_sequence}', to_jsonb(p_batch_sequence)
      ),
      '{updated_at}', to_jsonb(NOW()::TEXT)
    ),
    expires_at = GREATEST(expires_at, NOW() + INTERVAL '5 minutes')
  WHERE id = p_lock_id
    AND COALESCE((progress->>'batch_sequence')::INT, -1) < p_batch_sequence
  RETURNING
    (progress->>'children_completed')::INT,
    (progress->>'children_failed')::INT,
    (progress->>'children_total')::INT;
END;
$$ LANGUAGE plpgsql;
```

### Other RPCs (build during Sprint 1)

- `release_pulse_lock(p_lock_id)` — DELETE lock
- `create_conference_note_version(p_note_id, p_content, p_status)` — Version + status transition
- `get_stale_works(p_school_id, p_classroom_id)` — Reads thresholds from school settings, returns stale works with urgency tier
- `count_evidence(p_child_id, p_work_id, p_school_id, p_timezone)` — UNION ALL photo count (direct + junction table)
- `record_attendance(p_child_id, p_date)` — Upsert attendance + streak calc
- `batch_record_attendance(p_classroom_id, p_date, p_present_child_ids)` — Bulk attendance
- `get_weekly_summary(p_classroom_id, p_week_start, p_timezone)` — Aggregate progress for week
- `suggest_shelf_works(p_child_id)` — Based on mastered prerequisites + area balance
- `dismiss_stale_alert(p_child_id, p_work_name, p_teacher_id)` — Mark alert as acknowledged
- `get_trend_data(p_child_id, p_weeks)` — Progress velocity over N weeks
- `get_mastery_candidates(p_child_id)` — Works with strong photo evidence + extended practicing time
- `backfill_evidence_counts(p_school_id)` — Idempotent backfill for denormalized counts

---

## 17 API Routes

### Phase A (Core)
1. `POST /api/montree/pulse/start` — Acquire lock, return lock_id + child list + resume state
2. `POST /api/montree/pulse/generate-batch` — Process 3 children, 25s AbortController, return results
3. `POST /api/montree/pulse/complete` — Release lock, finalize pulse
4. `GET /api/montree/pulse/status` — Check if pulse is running + progress
5. `POST /api/montree/attendance/record` — Single child attendance
6. `POST /api/montree/attendance/batch` — Classroom batch attendance
7. `GET /api/montree/attendance/today` — Today's attendance for classroom

### Phase C (Intelligence)
8. `GET /api/montree/intelligence/stale-works` — Stale works for classroom
9. `GET /api/montree/intelligence/trends` — Progress trends for child
10. `POST /api/montree/intelligence/dismiss` — Dismiss stale alert

### Phase D (Communication)
11. `GET /api/montree/conference-notes` — Notes for child (teacher view)
12. `POST /api/montree/conference-notes` — Create/update note
13. `PATCH /api/montree/conference-notes/[id]` — Share/retract
14. `GET /api/montree/parent/conference-notes` — Parent view (shared only)

### Phase E (Planning)
15. `GET /api/montree/planning/shelf-suggestions` — AI-generated shelf suggestions
16. `GET /api/montree/planning/weekly-summary` — Weekly summary data

### Phase F (Admin)
17. `GET /api/montree/admin/pulse-dashboard` — Automation stats for admin

---

## 17 Components

### Phase B (UI)
1. `QuickActionsBar` — Contextual action buttons (phase-aware: morning/observation/afternoon)
2. `FloatingAttendanceFAB` — Floating button for quick attendance marking (safe-area aware)
3. `AttendanceSheet` — Full classroom attendance grid
4. `MasteryToast` — Persistent (non-auto-dismissing) mastery confirmation toast
5. `MasterySessionLog` — Collapsible log of all mastery events this session + "Update All Pending" button
6. `ObservationQuickEntry` — Rapid observation recording with icon templates
7. `IconLabelTransition` — Handles the icons-only transition after 3 sessions

### Phase C (Intelligence)
8. `StaleWorksPanel` — Dashboard panel showing works needing attention (🟢🟡🔴)
9. `TrendChart` — Simple progress velocity chart for a child
10. `IntelligenceDashboardCard` — Summary card on main dashboard

### Phase D (Communication)
11. `ConferenceNoteEditor` — Rich text editor with draft/share/retract controls
12. `ConferenceNoteParentView` — Read-only parent view with retraction banner
13. `ParentQuestionCard` — Parent question with 2-tier urgency badge
14. `OrphanDraftNudge` — Amber banner for unsent draft notes

### Phase E (Planning)
15. `PulseProgressModal` — Shows real-time progress during weekly pulse generation
16. `ShelfSuggestionCard` — AI-suggested works for child's shelf

### Phase F (Admin)
17. `AutomationDashboard` — Pulse history, success rates, timing stats

---

## Key Code Patterns (Reference During Build)

### IndexedDB + Volatile Fallback (Pulse Resume)

```typescript
const PULSE_DB = 'montree_pulse';
const PULSE_STORE = 'resume_state';
let volatilePulseState: PulseResumeState | null = null;

function getUpgradeCallback() {
  return {
    upgrade(db: IDBDatabase) {
      if (!db.objectStoreNames.contains(PULSE_STORE)) {
        db.createObjectStore(PULSE_STORE);
      }
    }
  };
}

async function savePulseState(state: PulseResumeState): Promise<void> {
  volatilePulseState = state;
  try {
    const db = await openDB(PULSE_DB, 1, getUpgradeCallback());
    await db.put(PULSE_STORE, state, 'current');
  } catch (err) {
    console.warn('[PULSE] IndexedDB write failed, using in-memory only:', err);
  }
}

async function loadPulseState(): Promise<PulseResumeState | null> {
  try {
    const db = await openDB(PULSE_DB, 1, getUpgradeCallback());
    const persisted = await db.get(PULSE_STORE, 'current');
    if (persisted) return persisted;
  } catch {}
  return volatilePulseState;
}

async function clearPulseState(): Promise<void> {
  volatilePulseState = null;
  try {
    const db = await openDB(PULSE_DB, 1, getUpgradeCallback());
    await db.delete(PULSE_STORE, 'current');
  } catch {}
}
```

### Sequential Client Batch Orchestration

```typescript
let batchSequence = resumeState?.lastBatchSequence || 0;

for (let i = 0; i < childBatches.length; i++) {
  batchSequence++;
  const { data, error } = await supabase.functions.invoke('pulse/generate-batch', {
    body: { child_ids: childBatches[i], batch_sequence: batchSequence }
  });
  if (error) {
    batchSequence--;
    failedBatches.push(childBatches[i]);
    continue;
  }
  await savePulseState({
    lockId, batchSequence,
    completedChildren: data.children_completed,
    failedChildren: data.children_failed,
  });
}
```

### Client Captures RETURNING Values

```typescript
const { data: progress, error } = await supabase.rpc('increment_pulse_progress', {
  p_lock_id: lockId,
  p_completed_delta: batchCompleted,
  p_failed_delta: batchFailed,
  p_batch_sequence: batchSequence,
});
if (!progress || progress.length === 0) {
  console.warn(`[PULSE] Batch ${batchSequence} rejected (stale sequence)`);
} else {
  const { children_completed, children_failed, children_total } = progress[0];
  updateProgressDisplay(children_completed, children_failed, children_total);
}
```

### UNION ALL for Photo Evidence

```sql
SELECT COUNT(DISTINCT id), COUNT(DISTINCT photo_date)
INTO v_count, v_days
FROM (
  SELECT m.id, DATE(m.captured_at AT TIME ZONE p_timezone) AS photo_date
  FROM montree_media m
  JOIN montree_children c ON m.child_id = c.id
  WHERE m.child_id = p_child_id AND m.work_id = p_work_id
    AND c.school_id = p_school_id AND m.captured_at IS NOT NULL
  UNION ALL
  SELECT m.id, DATE(m.captured_at AT TIME ZONE p_timezone) AS photo_date
  FROM montree_media_children mc
  JOIN montree_media m ON mc.media_id = m.id
  JOIN montree_children c ON mc.child_id = c.id
  WHERE mc.child_id = p_child_id AND m.work_id = p_work_id
    AND c.school_id = p_school_id AND m.captured_at IS NOT NULL
    AND m.child_id != p_child_id
) combined;
```

### Scoped Observation Dedup

```typescript
const recentObservations = new Map<string, number>();
function isDuplicate(childId: string, workName: string): boolean {
  const key = `${childId}:${workName.toLowerCase()}`;
  const lastTime = recentObservations.get(key);
  if (lastTime && Date.now() - lastTime < 5 * 60 * 1000) return true;
  recentObservations.set(key, Date.now());
  return false;
}
```

### getMondayInTimezone

```typescript
function getMondayInTimezone(timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'UTC',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const localDateStr = formatter.format(new Date());
  // Force UTC interpretation for day-of-week arithmetic
  const localDate = new Date(localDateStr + 'T00:00:00Z');
  const day = localDate.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  localDate.setUTCDate(localDate.getUTCDate() - diff);
  return localDate.toISOString().split('T')[0];
}
```

---

## Build Order (Sectioned by Sprint)

### Phase A: Foundation (Sprints 0-5) — Do First, Sequential

| Sprint | What | Est. |
|--------|------|------|
| 0a | Migration Part 1: DDL (tables, columns, indexes, timezone defaults) | 1h |
| 0b | Migration Part 2: Backfill (evidence counts, separate SQL, idempotent) | 30min |
| 1 | RPCs: all 15 RPCs (acquire_pulse_lock, increment_pulse_progress, etc.) | 3h |
| 2 | API: pulse/start + pulse/generate-batch (25s AbortController) | 3h |
| 3 | API: pulse/complete + pulse/status + attendance routes (3) | 2h |
| 4 | handleProgressChange flat cascade + timeout wrapper | 2h |
| 5 | Client pulse orchestrator (IndexedDB, sequential batches, resume) | 3h |

### Phase B: UI (Sprints 6-8) — Can Start After Sprint 5

| Sprint | What | Est. |
|--------|------|------|
| 6 | QuickActionsBar + FloatingAttendanceFAB + AttendanceSheet | 3h |
| 7 | MasteryToast + MasterySessionLog + ObservationQuickEntry | 3h |
| 8 | IconLabelTransition + PulseProgressModal | 2h |

### Phase C: Intelligence (Sprints 9-11) — Can Start After Sprint 1

| Sprint | What | Est. |
|--------|------|------|
| 9 | StaleWorksPanel + stale-works API + configurable thresholds | 2h |
| 10 | TrendChart + trends API + IntelligenceDashboardCard | 2h |
| 11 | Dismissal system + dismiss API | 1h |

### Phase D: Communication (Sprints 12-14) — Can Start After Sprint 1

| Sprint | What | Est. |
|--------|------|------|
| 12 | ConferenceNoteEditor + conference-notes API (CRUD) | 3h |
| 13 | ConferenceNoteParentView + parent API + 5-min SWR + retraction | 2h |
| 14 | ParentQuestionCard (2-tier urgency) + OrphanDraftNudge | 2h |

### Phase E: Planning (Sprints 15-17) — After Phase A Complete

| Sprint | What | Est. |
|--------|------|------|
| 15 | Weekly pulse integration (uses pulse orchestrator from Sprint 5) | 2h |
| 16 | ShelfSuggestionCard + shelf-suggestions API | 2h |
| 17 | Weekly summary API + planning view | 2h |

### Phase F: Admin (Sprints 18-19) — Last

| Sprint | What | Est. |
|--------|------|------|
| 18 | AutomationDashboard + pulse-dashboard API | 2h |
| 19 | Audit log + admin settings (staleness thresholds, pulse toggle) | 1h |

**Total estimated: ~42 hours across 20 sprints**

---

## Existing Codebase Patterns to Follow

### Auth Pattern
```typescript
import { verifySchoolRequest, VerifiedRequest } from '@/lib/montree/verify-request';
const auth = await verifySchoolRequest(request);
if (auth instanceof NextResponse) return auth;
// auth.userId, auth.schoolId, auth.classroomId, auth.role
```

### Supabase Client
```typescript
import { getSupabase } from '@/lib/supabase-client';
const supabase = getSupabase(); // Service role, server-side
```

### i18n Pattern
```typescript
// Always add keys to BOTH en.ts and zh.ts (perfect parity required)
// lib/montree/i18n/en.ts + zh.ts
// Component: const { t } = useI18n();
```

### Rate Limiting
```typescript
import { checkRateLimit } from '@/lib/rate-limiter';
const limited = await checkRateLimit(supabase, ip, endpoint, maxRequests, windowMinutes);
if (limited) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
```

### Fire-and-Forget DB Writes
```typescript
supabase.from('table').insert({...}).then(({ error }) => {
  if (error) console.error('[CONTEXT] fire-and-forget failed:', error);
}).catch(() => {});
```

### Error Response Pattern
```typescript
// NEVER expose error.message to client
return NextResponse.json({ error: 'Generic message' }, { status: 500 });
// Log the real error server-side only
console.error('[ROUTE_NAME] Operation failed:', error);
```

---

## What NOT to Change

- **montree_child_progress uses work_name** — Name-based tracking, not work_id. Don't change this.
- **montree_media has NO work_name column** — Media uses work_id (UUID FK). Photo evidence counts must JOIN through curriculum works.
- **montree_child_focus_works UNIQUE is (child_id, area)** — One focus work per area per child. Don't change this constraint.
- **Teacher sovereignty** — System SUGGESTS, teacher DECIDES. Mastery ALWAYS requires human confirmation. NEVER auto-advance status without teacher tap.
- **Flat cascade** — `handleProgressChange()` logs milestones and creates suggestions but NEVER triggers further progress changes. No cascading side effects.

---

## Checklist: Is This Handoff Complete?

- [x] Full plan v10-FINAL content (all 17 fixes with code snippets)
- [x] Pre-implementation items from Audit Cycle 10
- [x] Architecture constraints (Railway serverless)
- [x] 12 core principles
- [x] All new DB objects (3 tables, 1 view, 16 columns, 12 indexes)
- [x] All 15 RPCs (key ones with full SQL)
- [x] All 17 API routes (listed with descriptions)
- [x] All 17 components (listed with descriptions)
- [x] Key code patterns (IndexedDB, batch orchestration, RETURNING capture, UNION ALL, dedup, timezone)
- [x] Sectioned build order (20 sprints across 6 phases with time estimates)
- [x] Existing codebase patterns (auth, supabase, i18n, rate limiting, error handling)
- [x] What NOT to change (constraints to preserve)
- [x] CLAUDE.md has full project context (DB schema, auth systems, deployment, all previous work)

**For a fresh chat: This handoff + CLAUDE.md = everything needed to build.**

---

**END OF HANDOFF**
