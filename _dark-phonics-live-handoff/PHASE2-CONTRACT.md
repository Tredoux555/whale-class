# Dark Phonics Live — Phase 2 Contract: "Online Classes", working end to end

Phase 1 (last night) delivered the audited scaffold: migration 334 (unapplied),
credits ledger, booking/whiteboard/recap APIs, Midnight Studio classroom UI on
demo data. Phase 2 makes it a WORKING feature inside Montree named
**Online Classes**, flag-gated by `dark_phonics_live`, with clean extraction
boundaries so it can later be cut out as a standalone app.

## Product decisions (locked)
1. **Agora is optional for now.** The class must work end-to-end WITHOUT any
   Agora Whiteboard credentials and even without RTC video: the classroom's
   own Stage (native scene renderer) is the courseware, synced teacher→parent
   through our own DB, and video tiles show a clean "video not configured"
   state when `isAgoraConfigured()` is false. When RTC creds exist (they do in
   prod — parent↔teacher calls already work), video just works via the
   existing `AgoraVideoCall` component. Whiteboard SDK stays dormant until
   credentials are provisioned.
2. **Sync = simple polling, not websockets.** New table
   `montree_class_live_state` (one row per appointment). Teacher PATCHes it on
   every interaction; parent polls GET every 2s. Boring, reliable, works from
   China, zero new dependencies. Upgradeable later.
3. **Extraction-ready = bounded + one-way.** All DPL code lives ONLY in:
   `lib/montree/credits/`, `lib/montree/agora/whiteboard.ts`,
   `lib/montree/dark-phonics/`, `app/api/montree/dark-phonics-live/`,
   `app/api/montree/appointments/[id]/{whiteboard-token,recap,live-state}/`,
   `app/montree/{dashboard,parent}/online-classes/`,
   `app/montree/{dashboard,parent}/live/[appointmentId]/`,
   `app/montree/parent/recap/[appointmentId]/`,
   `components/montree/dark-phonics-live/`, `styles/dark-phonics-live-tokens.css`.
   NOTHING outside these paths may import from them (one-way dependency).
   DPL code touches the rest of Montree through exactly FOUR seams, each a
   single import: auth (`resolveAppointmentsParent`, `verifySchoolRequest`),
   data client (`getSupabase`), feature flag (`isFeatureEnabled`), and the
   existing `AgoraVideoCall` component. To extract later: re-implement the
   four seams, lift the bounded paths, done.

## Verified repo facts (do NOT re-derive; confirmed by direct reads this session)
- `getSupabase()` from `@/lib/supabase-client` — sync, service-role, retry-wrapped.
- `resolveAppointmentsParent(supabase)` from `@/lib/montree/appointments/parent-access`
  → `{ parentId, parentName, schoolId, childIds } | NextResponse`. Internally
  requires the school's `appointments` flag ON (accepted coupling for now).
- `verifySchoolRequest(request)` from `@/lib/montree/verify-request`
  → `{ userId, schoolId, classroomId, role, ... } | NextResponse`.
- `isFeatureEnabled(supabase, schoolId, featureKey)` from `@/lib/montree/features/server`.
- `'dark_phonics_live'` is already in the `FeatureKey` union (added Phase 1).
- `montree_appointments` (migration 216 + 222/223): columns include
  `id, school_id, classroom_id, child_id, parent_id, event_kind,
  scheduled_start, scheduled_end, duration_minutes, status
  ('pending'|'confirmed'|'cancelled'|'completed'|'no_show' — CHECK-constrained),
  ical_token, video_url, provider, recording_enabled`; Phase 1 migration adds
  `whiteboard_room_uuid`. Host rows required in `montree_appointment_hosts`
  (`appointment_id, host_role, host_id, is_primary, is_required, response, response_at`).
- Parent↔child link = `montree_parent_children` junction. `montree_children`
  has `classroom_id, name, age, ...` — NO parent_id, NO school_id column.
- Dark Phonics lessons: `RAW: RawLesson[]` inside
  `app/montree/library/dark-phonics/page.tsx` (~lines 170–304). `n` runs 5–53,
  display number = n − 4 (1–49). Fields: `n, sound, title, catchphrase,
  words?, books? (slug/title/cover?/materials?/works?), reader?
  (slug/title/works?/materials?/materialsSlug?), decodable?: string[],
  heartWords?: string[]`. Media: videos `videos/lesson-NN.mp4`, pictures
  `pictures/lesson-NN.png`, book covers `books/covers/<slug>.png`, all via
  `/api/montree/media/proxy/<path>?bucket=dark-phonics`.
- Phase 1 modules (already in repo, post-audit versions):
  `lib/montree/credits/ledger.ts` (getCreditBalance, grantCredits,
  spendCreditForBooking→RPC, reverseCreditForCancellation, markNoShow,
  listLedgerForChild), `lib/montree/dark-phonics/live-lesson.ts`
  (getLiveLessonScenes(displayNum 1–49), buildLiveLessonScenes, scene union:
  hero/word-chips/decodable-words/heart-words/book-cover, rawLessonNumber,
  displayLessonNumber, registerDarkPhonicsLessons), booking route
  `POST /api/montree/dark-phonics-live/book` (childId, scheduledStart,
  durationMinutes → 201 {appointment, creditsRemaining} | 402 insufficient).
- `isAgoraConfigured()` from `@/lib/montree/appointments/agora/config`.
- Migration 334 is UNAPPLIED and untracked — extending it in place is safe.
- Env: `DARK_PHONICS_LIVE_TEACHER_ID` = the solo teacher's montree_teachers.id.

## API contract (slice A builds these; slices B/C consume EXACTLY these shapes)
1. `GET/PATCH /api/montree/appointments/[id]/live-state`
   - Table `montree_class_live_state`: `appointment_id uuid PK REFERENCES
     montree_appointments ON DELETE CASCADE, active_scene_index int NOT NULL
     DEFAULT 0, active_word_index int NOT NULL DEFAULT -1, tracing_step_active
     boolean NOT NULL DEFAULT false, tracing_completed int NOT NULL DEFAULT 0,
     stars_earned int NOT NULL DEFAULT 0, class_phase text NOT NULL DEFAULT
     'live' CHECK (class_phase IN ('live','ended')), updated_at timestamptz
     NOT NULL DEFAULT now()`. RLS enabled, no policies. Add to migration 334.
   - GET (parent-of-this-appointment OR staff, `?as=` hint like siblings):
     200 `{ state: {activeSceneIndex, activeWordIndex, tracingStepActive,
     tracingCompleted, starsEarned, classPhase, updatedAt} }` — return the
     DEFAULT state (all defaults above) if no row yet, don't 404.
   - PATCH (staff only): body = any subset of the five mutable fields
     (camelCase) → upsert on appointment_id, return same shape as GET.
2. `GET /api/montree/dark-phonics-live/credits?childId=...`
   (parent, must own child via childIds): 200 `{ balance: number,
   ledger: Array<{delta, reason, note, createdAt}> }` (ledger = last 50).
3. `POST /api/montree/dark-phonics-live/credits/grant` (staff only):
   body `{ childId, credits, note? }` → grantCredits(), 201
   `{ balance }`. Also `GET .../credits/admin` (staff): 200
   `{ children: Array<{childId, childName, parentName, balance}> }` — join
   montree_children + montree_parent_children + montree_parents + the
   balances view for the staff's school.
4. `GET /api/montree/dark-phonics-live/classes` (parent): 200
   `{ upcoming: Appointment[], past: Array<Appointment & {hasRecap:boolean}> }`
   where Appointment = `{id, childId, childName, scheduledStart, scheduledEnd,
   durationMinutes, status}`; DPL appointments only (provider='agora' AND
   booked via this feature — filter: has a class_booked ledger row; join it).
   Staff variant `?as=teacher`: all upcoming/past for the school.
All routes: flag-gate `dark_phonics_live` (404 when off), auth exactly like
Phase 1 siblings.

## Lesson-number source of truth
The appointment does NOT yet carry which lesson is being taught. Rule:
`lesson_number` (display 1–49) for a class = (recap row if exists) else
(child's progress = count of that child's recaps + 1, capped at 49) — i.e.
next lesson in sequence. Slice A exposes it in GET live-state response as
`lessonNumber` (computed, read-only). Slice C consumes it. Simple, no schema
change, teacher can override later.

## Non-goals (still deferred)
Whiteboard SDK activation, recording, Stripe, multi-teacher, availability/slot
conflict checking, share-image export of recap, nav-menu integration beyond a
single flag-gated link if (and only if) an obvious nav registry exists.

## Quality bar
Every file compiles under the repo's tsconfig (validated with tsc after the
build), follows sibling-route conventions, no imports INTO the bounded paths
from outside, and every ASSUMPTION that couldn't be verified is marked.
