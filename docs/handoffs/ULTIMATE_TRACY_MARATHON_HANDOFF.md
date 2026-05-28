# ULTIMATE TRACY — Marathon Build Handoff

> **For: the overnight agent picking this up cold.**
>
> **Mission:** make Tracy know every parent in the school by name, every
> meeting that's ever happened, every pattern she's learned. Self-improving
> brain. Conversation memory. Parent-as-first-class-entity.
>
> **Read this entire document before touching code.** Every decision is
> locked. Every phase is self-contained. The architecture was theorised
> in conversation with Tredoux on May 28, 2026 — go with the
> recommendations, don't re-debate.
>
> **You are running overnight.** Aim for full completion. If context
> gets tight, EACH PHASE has a "minimum viable demonstration" target
> below the full target — ship that and document carry-overs so Tredoux
> wakes up to something working, not to a half-merged mess.
>
> **Tredoux is the principal user.** He'll wake up around 7am China time
> (~12 hours from session start). He wants to see real progress, real
> commits on `main`, real verification steps, and an honest accounting
> of what landed vs what remains.

---

## 1. Mission

The Ultimate Tracy is a chief-of-staff who knows every parent in the
school by name and history — not just by email. She can prepare for any
meeting by reading both the CHILD's record (already done) AND the
PARENT's profile (new). She can listen to a meeting, transcribe it,
extract structured insights, propose profile updates. And she builds her
own corpus of school-specific wisdom over time — what works with which
archetype, what landed, what backfired.

This unlocks three things Tracy can't do today:
1. **Personalised parent-meeting dossiers.** Not just "here's what we
   know about Yo-yo" but "here's what we know about Yo-yo AND here's
   how to talk to his mother specifically."
2. **Institutional memory.** Every meeting feeds back into the system.
   Six months in, Tracy's read of any parent is sharper than a fresh
   principal's. The school's relational knowledge accumulates instead
   of evaporating each year.
3. **Self-improvement.** Tracy starts learning from her own
   conversations — same auto-corpus pattern Guru uses for child
   pedagogy. Tracy's adult-relational craft will sharpen with every
   real meeting that goes through the system.

---

## 2. State of repo at handoff time

### 2a. Commits on `main` (top → newer)

```
1ffdb24a  Tracy v2: psychological mind via Guru-pattern knowledge base
0a1f2aa0  Tracy Phase 1: diagnostic plumbing for parent-meeting strikeout
ee52f898  Dashboard glow clip + keepalive route + cron docs
7eb91f94  Tracy: stream parent-meeting tokens directly to client
f2fa4c14  Tracy: Sonnet swap + quick-brief default + brevity discipline
```

### 2b. What's already live (don't rebuild)

| System | Where | Status |
|---|---|---|
| Tracy's persistent memory per principal | `montree_principal_memory` (migration 195) | ✅ Live |
| Tracy's psychological knowledge base | `lib/montree/tracy/knowledge/*.md` (7 files + INDEX + loader.ts) | ✅ Live |
| Tracy's chat system prompt with knowledge summary | `lib/montree/tracy/system-prompt.ts` | ✅ Live |
| `consult_tracy_knowledge` tool | `lib/montree/tracy/tool-{definitions,executor}.ts` | ✅ Live |
| Dossier cache table + 24h TTL | `montree_meeting_dossiers` (migration 237) | ✅ RUN per Tredoux's Supabase verification screenshot |
| Diagnostic plumbing on prepare_parent_meeting | `[prepare_parent_meeting]` logs + per-chunk watchdog + 15s UI fallback | ✅ Live |
| 16 Tracy tools (child_focus, unpack_teacher, prepare_parent_meeting, etc.) | `lib/montree/tracy/tool-definitions.ts` | ✅ Live |
| Audio-free meeting notes (teacher + principal) | `/montree/dashboard/conversations` + `/montree/admin/meeting-notes` (migrations 214 + 215) | ✅ Live |
| Whisper transcription pipeline | `/api/montree/voice-notes/transcribe` | ✅ Live, reusable |
| Vault encryption pattern | `lib/montree/vault-crypto.ts` (AES-256-GCM, PBKDF2) | ✅ Live, reusable |
| `montree_parents` + `montree_parent_children` | Migration ~120s | ✅ Live (extends in Phase A) |

### 2c. What's pending (handle in scope of this build OR after)

| Item | Status | Action |
|---|---|---|
| Tracy knowledge files have ZERO i18n (English-only) | Deliberate — frameworks not UI | No action |
| `montree_parents` rich profile data | DOES NOT EXIST | **Phase A builds it** |
| Meeting recording for IN-PERSON meetings (not video) | DOES NOT EXIST | **Phase B builds it** |
| Auto-corpus / self-improving brain | DOES NOT EXIST | **Phase C builds it** |
| "Parents" tab in principal nav | DOES NOT EXIST | **Phase D builds it** |
| Two-party consent flag per parent | DOES NOT EXIST | **Phase E builds it** |

### 2d. Critical existing infrastructure to reuse

**DO NOT REBUILD** any of these — wrap or extend instead:

1. **`lib/montree/voice-notes/transcribe`** — Whisper integration. Takes
   FormData with `audio` field, returns `{ transcript, locale_detected,
   cost_usd }`. Audio is discarded after transcription. Phase B uses this.

2. **`lib/montree/vault-crypto.ts`** — AES-256-GCM with PBKDF2. The
   existing pattern from migration 185 (principal vault). Phase B
   transcripts use the SAME encryption module, not a new one.

3. **`lib/montree/tracy/knowledge/loader.ts`** — the canonical loader
   pattern for "static markdown files cached in process memory". Phase C
   corpus retrieval mirrors this for dynamic content.

4. **`/api/montree/admin/principal-agent/route.ts`** — Tracy's SSE
   route. Phase A + C add new tool wirings here. DO NOT touch the SSE
   plumbing or the cost-model assertion logic.

5. **`lib/montree/tracy/tools/prepare_parent_meeting.ts`** — Already
   loads child context + Guru analyses + pattern detection. Phase A adds
   parent profile loading to this pipeline. Phase C adds corpus
   retrieval. The streaming + cache + diagnostic plumbing stays
   untouched.

6. **`getTracyKnowledge()` / `getTracyKnowledgeSummary()`** — process-
   cached, Promise-safe (clears `cachedPromise` in finally{} so a
   rejection isn't permanent). Phase C corpus loader follows this exact
   pattern.

---

## 3. Decisions locked in (DO NOT re-debate)

Tredoux explicitly said "go with my recommendations." These are locked:

1. **Onboarding is voice-first** with a "type instead" link for
   accessibility. The voice flow is 60-90s recording → Sonnet structures
   into profile fields → principal reviews + saves.

2. **Both principal AND teacher can onboard a parent.** When both have
   onboarded the same parent, the principal's evaluation wins on the
   visible profile, but the teacher's evaluation is preserved as a
   second perspective the principal can see.

3. **Meeting types are an enum:** `parent_teacher_conference`,
   `intro`, `escalation`, `exit`, `behavioural`, `progress`,
   `other`. Sonnet analysis prompts specialise per type.

4. **Recording is phone-on-table for v1.** No Bluetooth lapel mic
   integration. Web Audio API + MediaRecorder API. Chunked upload to the
   existing transcribe endpoint. Lapel mic is a future iteration.

5. **Profile updates ALWAYS require principal review for v1.** Sonnet
   proposes; principal taps approve/edit/dismiss. Auto-write earns the
   right after 3 months of human-in-the-loop data.

6. **Corpus is school-scoped only for v1.** Cross-school
   anonymized learning is a separate privacy build — out of scope.

7. **Recording duration cap: 60 minutes per meeting** with automatic
   chunking (Whisper handles ~25 min per file, so we split into 3 chunks
   max and stitch the transcripts together server-side).

8. **The dossier becomes two-half.** Section 5 of the existing dossier
   ("The parent") is now richly populated from the parent profile +
   meeting history + corpus, not just `guru_parent_states`. The 9-section
   structure stays the same; the parent half gets dramatically deeper.

9. **Phone-as-recorder UX:** the principal taps "Record meeting" on her
   phone, types the parent's name (or picks from a list), confirms
   consent, then sets the phone face-down on the table. A subtle red dot
   appears at the top of her screen while recording. Tapping anywhere
   pauses/resumes. Long-pressing stops.

10. **Failed extractions don't crash the system.** Every Sonnet
    extraction (intake, meeting analysis, corpus extraction) is wrapped
    in try/catch with graceful degradation. The raw transcript ALWAYS
    saves; the analysis is best-effort.

11. **Privacy is non-negotiable.** Every architectural rule in Section 4
    is load-bearing.

---

## 4. Privacy + Security architectural rules (LOAD-BEARING)

Break any of these and the feature has to be ripped out. These are not
guidelines.

1. **Audio NEVER persists** beyond the transcription window. Audio
   buffer → Whisper → text → buffer destroyed. No Supabase Storage
   upload. No tmp file written to disk. Mirror the existing meeting-notes
   route exactly.

2. **Transcripts encrypted at rest** via `lib/montree/vault-crypto.ts`
   (AES-256-GCM, PBKDF2). The encryption key is the school-scoped
   `MONTREE_ENCRYPTION_KEY` env var (already live for Session 121
   encryption). NEVER store transcripts as plaintext.

3. **Consent gate before every recording.** The recording button is
   DISABLED until the principal checks a "Mrs Chen has been informed
   and agreed" checkbox. Once recording starts, a persistent banner
   stays visible: *"Recording active. Tap to stop."* No way to hide it.

4. **Two-party consent flag per parent.** When the principal first
   sets up a parent in the system, she sets a flag: "Is this parent's
   consent on file for being recorded in future meetings?" If "no",
   the record button is grayed out forever for that parent until the
   flag is flipped (which requires an audit-logged action).

5. **Parent data-export endpoint.** GDPR/CCPA-style. The parent can
   request all their profile + transcript data via a request to the
   principal; the principal exports via a one-click action.

6. **Principal can DELETE any transcript / analysis at any time.**
   Right-click → delete → gone (with deletion logged to
   `montree_super_admin_audit`-equivalent).

7. **Corpus entries don't quote verbatim.** Sonnet extracts ABSTRACTED
   insights. "Mrs Chen said her daughter X" becomes corpus: "comparison
   to older siblings is a trigger for expectation-driven parents at
   this school." No names. No direct quotes. The corpus is school-
   ABOUT-archetypes, not school-ABOUT-individuals.

8. **Cross-pollination contract** on EVERY new query. Every new table
   has `school_id`. Every new query filters by the principal's
   `school_id`. Already-existing helpers (`verifySchoolRequest`,
   `verifyChildBelongsToSchool`) wrap every endpoint.

9. **Corpus retrieval RAG is also school-scoped.** When Tracy retrieves
   corpus entries for a chat or dossier, the WHERE filter on
   `montree_tracy_corpus` is hard-coded `school_id = principalSchoolId`.
   No exceptions, no global insights bleeding across schools.

10. **Deletion cascades.** When a parent is deleted (rare but possible),
    profile + meetings + transcripts + analyses + corpus entries
    referencing them all cascade-delete via FK constraints.

---

## 5. Phase A — Parent Profiles + Voice Onboarding

**Goal:** parents become first-class entities with rich psychological
profiles. Tracy can answer "tell me about Mrs Chen" with substance, not
just metadata.

**Effort:** ~2 days condensed. Aim for 2.5-3 hours.

**Minimum viable demonstration** (if context gets tight): migration
runs, voice onboarding works, profile shows on a per-parent surface,
`get_parent_profile` tool returns the profile to Tracy. Skip the
dossier integration — that's the cherry, but the foundation is the
profile itself.

### 5.1 Migration 238 — `montree_parent_profiles`

```sql
-- migrations/238_parent_profiles.sql
BEGIN;

CREATE TABLE IF NOT EXISTS montree_parent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cross-pollination scope (load-bearing).
  parent_id UUID NOT NULL REFERENCES montree_parents(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- The five canonical archetypes from Tracy's knowledge file 04.
  -- Stored as text[] because parents often span 2 archetypes.
  archetypes TEXT[] NOT NULL DEFAULT '{}',

  -- Cultural register — structured JSONB so we can add dimensions later
  -- without migration. Keys reference Erin Meyer's Culture Map
  -- dimensions (file 05).
  cultural_register JSONB NOT NULL DEFAULT '{}',
  -- Example shape:
  -- {
  --   "communicating": "high_context",
  --   "evaluating": "indirect",
  --   "persuading": "principles_first",
  --   "leading": "hierarchical",
  --   "deciding": "consensual",
  --   "trusting": "relationship_based",
  --   "disagreeing": "avoids_confrontation",
  --   "scheduling": "linear"
  -- }

  -- Language the parent emotionally processes in (often differs from
  -- their English fluency). ISO 639-1 code or empty string.
  preferred_language TEXT NOT NULL DEFAULT 'en',

  -- Triggers — specific things to AVOID with this parent.
  known_triggers TEXT[] NOT NULL DEFAULT '{}',

  -- Moves that work — specific things that have consistently landed.
  effective_moves TEXT[] NOT NULL DEFAULT '{}',

  -- Relationship temperature — Tracy reads this from threads + meetings.
  relationship_temperature TEXT NOT NULL DEFAULT 'neutral'
    CHECK (relationship_temperature IN ('warm', 'neutral', 'strained', 'repairing')),

  -- Family context — long-memory free-text.
  family_context TEXT NOT NULL DEFAULT '',

  -- What the parent has said matters most to her.
  priorities_for_child TEXT[] NOT NULL DEFAULT '{}',

  -- Free-text long-memory anything-goes field.
  history_notes TEXT NOT NULL DEFAULT '',

  -- Lightweight stats.
  meeting_count INTEGER NOT NULL DEFAULT 0,
  last_meeting_date TIMESTAMPTZ,
  last_thread_message_at TIMESTAMPTZ,

  -- Lifecycle.
  source TEXT NOT NULL DEFAULT 'principal_typed'
    CHECK (source IN ('onboarded_voice', 'onboarded_typed', 'inferred_from_threads', 'extracted_from_meeting', 'principal_typed')),
  evaluated_by_role TEXT NOT NULL DEFAULT 'principal'
    CHECK (evaluated_by_role IN ('principal', 'teacher')),
  evaluated_by_id UUID,
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One profile per (parent, school) pair. A parent at School A vs
  -- School B has independent profiles even if they're the same human.
  UNIQUE (parent_id, school_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_profiles_school
  ON montree_parent_profiles (school_id);

CREATE INDEX IF NOT EXISTS idx_parent_profiles_parent
  ON montree_parent_profiles (parent_id);

-- Auto-bump updated_at trigger.
CREATE OR REPLACE FUNCTION montree_parent_profiles_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_parent_profiles_touch ON montree_parent_profiles;
CREATE TRIGGER trg_parent_profiles_touch
  BEFORE UPDATE ON montree_parent_profiles
  FOR EACH ROW EXECUTE FUNCTION montree_parent_profiles_touch_updated_at();

COMMIT;
```

### 5.2 Voice onboarding intake structurer

**New module:** `lib/montree/parent-profile/voice-intake.ts`

```typescript
// Exports:
//   parseVoiceIntake({ transcript, parentName, locale, anthropic })
//     → { profile: ParentProfileDraft, costUsd, generationMs }
//
// Uses a Sonnet tool_use call. The tool schema enforces the five
// archetypes + the Culture Map dimensions + the trigger/move lists.
// Sonnet returns ONLY what was implied by the principal's transcript;
// blanks stay blank.
```

The system prompt for Sonnet should be ~500 words and should explicitly
reference the archetypes from `lib/montree/tracy/knowledge/04-parent-psychology-patterns.md`
and the Culture Map dimensions from `05-cultural-communication.md`.
Do NOT inline the full text — quote the canonical names + 1-line
descriptions.

### 5.3 API routes

**New:** `app/api/montree/admin/parent-profile/route.ts`
- `GET ?parent_id=X` → returns the profile (school-scoped via auth).
- `POST` → upsert from voice intake (body: `parent_id, transcript,
  locale`). Calls `parseVoiceIntake`, persists, returns the draft.
- `PATCH ?id=X` → edit a profile (body: any subset of fields).
- `DELETE ?id=X` → soft-delete (just clear all fields, leave row for
  audit).

**Also extends:** `app/api/montree/admin/parent-profile/list/route.ts`
- `GET` → returns all parents in the school with their profile summary
  (archetype tags + meeting count + last_meeting_date). For the Parents
  tab in Phase D.

### 5.4 Voice onboarding UI

**New page:** `app/montree/admin/parents/[parentId]/onboard/page.tsx`

Mirrors the existing teacher voice-onboarding pattern at
`app/montree/dashboard/voice-onboarding/page.tsx` (which already exists
and works). Reuse the recording component if possible.

Flow:
1. Page loads with parent name at top + child name(s) in subtitle.
2. Big record button + ~90s timer.
3. Helper text below: *"Tell me about Mrs Chen — what kind of parent
   is she, what matters to her, what should I watch out for, what
   works."*
4. On stop: transcript appears + spinner.
5. Sonnet parses, returns draft profile.
6. Editable card view: principal can adjust each field.
7. Save button → POST → persisted.

### 5.5 Tracy tool wiring

**Add to** `lib/montree/tracy/tool-definitions.ts`:

```typescript
{
  name: 'get_parent_profile',
  description:
    "Retrieve the structured profile for a specific parent. Use whenever the principal asks about a parent by name or mentions an upcoming meeting with a parent. Returns: archetypes (expectation-driven, anxiety-projecting, hands-off, comparison-trapped, defended), cultural_register (8 dimensions from Erin Meyer's Culture Map), preferred_language, known_triggers (things to avoid), effective_moves (things that work), relationship_temperature, family_context, priorities_for_child, history_notes, meeting_count, last_meeting_date. Requires parent_id. If you have a parent name only, list_parents_for_school first.",
  input_schema: {
    type: 'object',
    properties: {
      parent_id: { type: 'string' },
    },
    required: ['parent_id'],
  },
},
{
  name: 'list_parents_for_school',
  description:
    "List parents in the principal's school with name + child names + archetype tags + last meeting date. Use when you need to resolve a parent name to an id, or when the principal asks 'who are my parents?' or 'which parents haven't I met recently?'",
  input_schema: {
    type: 'object',
    properties: {
      classroom_id: {
        type: 'string',
        description: 'Optional — narrow to one classroom.',
      },
    },
  },
},
```

**Add dispatch cases to** `lib/montree/tracy/tool-executor.ts`. Both
tools are school-scoped via `deps.schoolId`.

### 5.6 Dossier integration

**Modify** `lib/montree/tracy/tools/prepare_parent_meeting.ts`:

After the existing parallel fetch (childContext + consultGuru +
detectPattern), add a third parallel branch: load the parent profile
for the child's primary parent. If multiple parents are linked to the
child, prefer the one specified in the meeting_purpose (Sonnet can
parse the name out) or default to the first linked parent.

Inject into `structuredContext` as a new section right after `# PARENT
— PRINCIPAL OVERRIDE`:

```
# PARENT PROFILE (rich — use this to personalise the dossier)
Archetypes: {profile.archetypes}
Cultural register: {profile.cultural_register}
Preferred language: {profile.preferred_language}
Known triggers: {profile.known_triggers}
Effective moves: {profile.effective_moves}
Relationship temperature: {profile.relationship_temperature}
Family context: {profile.family_context}
Priorities for child: {profile.priorities_for_child}
Meeting count: {profile.meeting_count}
History notes: {profile.history_notes}
```

The Sonnet system prompt (in `parent_meeting_prep.ts`) already
references the parent — extend the existing "Section 5: The parent"
guidance to say: "Use the PARENT PROFILE block above as your primary
source. Calibrate every section of the dossier to this parent's
archetypes + cultural register + known triggers + effective moves."

### 5.7 Phase A audit gate

Before commit:
- [ ] Migration 238 ran cleanly in Supabase (or note as pending in
      handoff)
- [ ] Lint clean on all 6+ new/modified files
- [ ] Voice intake parser handles edge cases (no Sonnet response,
      malformed JSON, fields missing) gracefully
- [ ] Cross-pollination: every new query filters by `school_id`
- [ ] Tool dispatch coverage: 2 new tools, 2 new cases
- [ ] `get_parent_profile` correctly returns 404 when parent doesn't
      belong to the principal's school
- [ ] Tracy's system prompt updated INTENT TABLE to mention
      `get_parent_profile` for "tell me about [parent name]"
- [ ] `prepare_parent_meeting` dossier visibly uses the parent profile
      data when it exists (verify by reading the prompt assembly code)

### 5.8 Phase A commit + push

Single commit. Title:
```
Ultimate Tracy Phase A: parents become first-class entities

Adds montree_parent_profiles + voice-first onboarding intake + 2 new
Tracy tools (get_parent_profile, list_parents_for_school). The
parent-meeting dossier now personalises to this parent's archetype +
cultural register + known triggers, not just to the child's record.

[detailed body — see commit message conventions in CLAUDE.md]
```

Push via Desktop Commander on the Mac per CLAUDE.md push rule.

### 5.9 Refresh checkpoint

If your context window is at 70%+ utilisation, this is a clean
checkpoint to refresh:
1. Commit + push Phase A.
2. Write a 1-paragraph status update appending to this handoff doc
   (under "Phase A — RESULT").
3. Save & quit. Next session picks up Phase B with full context.

If context is healthy (<60%), proceed straight to Phase B.

---

## 6. Phase B — Meeting Recording + Transcription + Analysis

**Goal:** the principal records a parent meeting in-app, Tracy
transcribes + analyses + proposes profile updates + writes a follow-up
plan. The headline feature.

**Effort:** ~3 days condensed. Aim for 3.5-4 hours.

**Minimum viable demonstration** (if context gets tight): migrations
run, recording UI works, transcript saves encrypted, analysis returns
structured Sonnet output, profile-update proposals visible on a review
screen. Skip the rich follow-up planning + the corpus extraction (that
moves to Phase C).

### 6.1 Migrations 239 + 240 + 241

```sql
-- migrations/239_parent_meetings.sql
BEGIN;

CREATE TABLE IF NOT EXISTS montree_parent_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cross-pollination scope (load-bearing).
  parent_id UUID NOT NULL REFERENCES montree_parents(id) ON DELETE CASCADE,
  child_id UUID REFERENCES montree_children(id) ON DELETE SET NULL,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- Who's holding it.
  principal_id UUID REFERENCES montree_school_admins(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,

  -- Lifecycle.
  scheduled_at TIMESTAMPTZ,
  held_at TIMESTAMPTZ,
  duration_minutes INTEGER,

  meeting_type TEXT NOT NULL DEFAULT 'parent_teacher_conference'
    CHECK (meeting_type IN (
      'parent_teacher_conference',
      'intro',
      'escalation',
      'exit',
      'behavioural',
      'progress',
      'other'
    )),

  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'held', 'cancelled', 'needs_follow_up', 'closed')),

  -- Optional linked artifacts.
  linked_dossier_id UUID REFERENCES montree_meeting_dossiers(id) ON DELETE SET NULL,
  -- transcript_id + analysis_id are populated by 240 + 241 below
  -- but we add the FKs after those tables exist (see end of file).

  -- Free-text outcome — principal types this after the meeting
  -- (one-line "how did it land").
  outcome_notes TEXT NOT NULL DEFAULT '',

  -- Locale of the meeting (e.g. 'zh' if Mandarin was the medium).
  locale TEXT NOT NULL DEFAULT 'en',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_meetings_school
  ON montree_parent_meetings (school_id, held_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_parent_meetings_parent
  ON montree_parent_meetings (parent_id, held_at DESC NULLS LAST);

CREATE OR REPLACE FUNCTION montree_parent_meetings_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_parent_meetings_touch ON montree_parent_meetings;
CREATE TRIGGER trg_parent_meetings_touch
  BEFORE UPDATE ON montree_parent_meetings
  FOR EACH ROW EXECUTE FUNCTION montree_parent_meetings_touch_updated_at();

COMMIT;
```

```sql
-- migrations/240_parent_meeting_transcripts.sql
BEGIN;

CREATE TABLE IF NOT EXISTS montree_parent_meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  meeting_id UUID NOT NULL REFERENCES montree_parent_meetings(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- Encrypted transcript text. AES-256-GCM via vault-crypto.ts.
  -- NEVER store plaintext here.
  transcript_text_encrypted TEXT NOT NULL,
  encryption_version INTEGER NOT NULL DEFAULT 1,

  -- Whisper metadata.
  locale_detected TEXT,
  whisper_model_used TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 1, -- how many audio chunks Whisper processed

  -- Cost telemetry.
  cost_usd NUMERIC(10, 4),
  generation_ms INTEGER,

  -- Audit trail: proof we destroyed the audio.
  audio_destroyed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_meeting_transcripts_meeting
  ON montree_parent_meeting_transcripts (meeting_id);

CREATE INDEX IF NOT EXISTS idx_parent_meeting_transcripts_school
  ON montree_parent_meeting_transcripts (school_id);

COMMIT;
```

```sql
-- migrations/241_parent_meeting_analyses.sql
BEGIN;

CREATE TABLE IF NOT EXISTS montree_parent_meeting_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  meeting_id UUID NOT NULL REFERENCES montree_parent_meetings(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- The chief-of-staff summary (3 paragraphs, markdown).
  summary_markdown TEXT NOT NULL,

  -- Structured extractions.
  parent_revealed TEXT[] NOT NULL DEFAULT '{}',
  commitments_made TEXT[] NOT NULL DEFAULT '{}',
  emotional_arc TEXT NOT NULL DEFAULT '', -- e.g. "started defensive, ended collaborative"
  triggers_observed TEXT[] NOT NULL DEFAULT '{}',
  moves_that_landed TEXT[] NOT NULL DEFAULT '{}',
  unresolved_threads TEXT[] NOT NULL DEFAULT '{}',
  recommended_follow_up TEXT NOT NULL DEFAULT '',

  -- Profile-update proposals. JSONB so Sonnet can propose arbitrary
  -- field updates. Principal reviews + approves on the UI.
  -- Shape: { "field_name": { "current": ..., "proposed": ..., "reason": "..." } }
  profile_update_proposals JSONB NOT NULL DEFAULT '{}',
  proposals_reviewed_at TIMESTAMPTZ, -- set when principal taps Approve/Dismiss
  proposals_review_outcome TEXT
    CHECK (proposals_review_outcome IN ('approved_all', 'approved_some', 'dismissed_all', 'edited')),

  -- Corpus extraction candidates — Phase C reads from here.
  corpus_extractions TEXT[] NOT NULL DEFAULT '{}',
  corpus_extracted_at TIMESTAMPTZ, -- set when Phase C extraction job runs

  -- Cost telemetry.
  model_used TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(10, 4),
  generation_ms INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_meeting_analyses_meeting
  ON montree_parent_meeting_analyses (meeting_id);

-- Phase C scans this regularly to find unprocessed analyses.
CREATE INDEX IF NOT EXISTS idx_parent_meeting_analyses_unprocessed
  ON montree_parent_meeting_analyses (school_id, corpus_extracted_at)
  WHERE corpus_extracted_at IS NULL;

-- After 241 lands, retro-add the FKs on 239 (separate file to keep
-- forward references clean).
-- migrations/241b_parent_meetings_link_artifacts.sql
ALTER TABLE montree_parent_meetings
  ADD COLUMN IF NOT EXISTS transcript_id UUID
    REFERENCES montree_parent_meeting_transcripts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS analysis_id UUID
    REFERENCES montree_parent_meeting_analyses(id) ON DELETE SET NULL;

COMMIT;
```

### 6.2 Recording UI

**New page:** `app/montree/admin/parents/[parentId]/meetings/new/page.tsx`

Flow:
1. Page loads with parent name + child name at top.
2. Meeting type selector (radio buttons for the enum).
3. Consent gate — checkbox + verbal-consent script the principal can
   read aloud: *"This meeting is being recorded for note-taking only.
   Audio is destroyed after transcription. Is that okay with you?"*
4. Big record button — DISABLED until consent checked.
5. On tap: MediaRecorder API starts, chunks audio every ~20 minutes
   (Whisper's safe ceiling), uploads each chunk to `/api/montree/admin/parents/[parentId]/meetings/transcribe-chunk`.
6. Persistent banner during recording: red dot + "Recording active —
   tap to stop". Tapping pauses; long-press stops.
7. On stop: spinner + "Tracy is reading the meeting…" — final analysis
   call fires.
8. Result screen: summary + structured extractions + profile-update
   proposals (reviewable).

### 6.3 Transcription pipeline

**New route:** `app/api/montree/admin/parents/[parentId]/meetings/transcribe-chunk/route.ts`
- Accepts FormData with `audio` blob + `meeting_id` + `chunk_index`.
- Calls existing `/api/montree/voice-notes/transcribe` internally.
- Stores chunk transcript in a tmp Map keyed by meeting_id (in-memory).
- On final chunk: stitches transcripts together, encrypts via
  vault-crypto, INSERTs row into `montree_parent_meeting_transcripts`.
- Returns `{ transcript_id, locale_detected, total_cost_usd }`.

### 6.4 Analysis route

**New route:** `app/api/montree/admin/parents/[parentId]/meetings/analyse/route.ts`
- POST with `{ meeting_id, transcript_id }`.
- Loads + decrypts transcript.
- Loads parent profile.
- Calls Sonnet with `PARENT_MEETING_ANALYSIS_SYSTEM_PROMPT` (new
  prompt — see 6.5).
- Sonnet returns structured analysis via tool_use.
- INSERTs row into `montree_parent_meeting_analyses`.
- Returns the analysis to the client for principal review.

### 6.5 Analysis prompt

**New module:** `lib/montree/parent-meeting/analysis-prompt.ts`

Exports `PARENT_MEETING_ANALYSIS_SYSTEM_PROMPT` (~1500 words). Should
reference Tracy's knowledge base — specifically files 02 (difficult
conversations), 04 (archetypes), 05 (cultural), 07 (de-escalation) —
NOT by quoting them, but by name so Sonnet knows the frameworks it's
applying.

The prompt should specialise by meeting type. E.g., for `escalation`,
heavy emphasis on triggers + moves that worked. For `intro`, heavy
emphasis on archetypes + cultural register + family context. For
`progress`, heavy emphasis on commitments + emotional arc.

### 6.6 Profile-update review UI

**New page:** `app/montree/admin/parents/[parentId]/meetings/[meetingId]/review/page.tsx`

Shows the analysis result + a card for each profile-update proposal
with:
- Field name
- Current value
- Proposed value (with reasoning from Sonnet)
- Approve / Edit / Dismiss buttons

On Approve: PATCH `/api/montree/admin/parent-profile?id=X` with the
new value, mark `proposals_review_outcome = 'approved_all'` or
`'approved_some'`.

### 6.7 Phase B audit gate

- [ ] Migrations 239, 240, 241, 241b ran cleanly
- [ ] Lint clean on all new files
- [ ] Audio is verifiably destroyed after transcription (grep for any
      Storage upload — should be ZERO)
- [ ] Transcripts written with `encryption_version = 1`, encrypted
      payload starts with `gcm:` prefix
- [ ] Cross-pollination on every query
- [ ] Consent gate cannot be bypassed (disabled button + audit)
- [ ] Long meeting (45+ min) chunks correctly + stitches
- [ ] Sonnet analysis returns structured output for at least 3 of the
      7 meeting types (test prompts manually)
- [ ] Profile-update proposals NEVER auto-apply
- [ ] Deletion of a transcript cascades correctly

### 6.8 Phase B commit + push

Single commit. Title: `Ultimate Tracy Phase B: meeting recording +
transcription + analysis pipeline`

### 6.9 Refresh checkpoint

This is the biggest phase. If context is at 70%+ after Phase B, REFRESH
HERE. The remaining phases (C, D, E) can each be done in a clean
context window of 50K tokens.

---

## 7. Phase C — Auto-Corpus + Retrieval-Augmented Tracy

**Goal:** Tracy starts learning from every meeting analysis and every
long parent thread. Corpus entries get retrieved by semantic similarity
+ filter and injected into Tracy's prompts when relevant.

**Effort:** ~2 days condensed. Aim for 2-2.5 hours.

**Minimum viable demonstration** (if context gets tight): migration
runs, extraction job extracts insights from at least one analysed
meeting, `search_corpus` tool works, Tracy uses retrieved insights in
at least one chat reply. Skip the pgvector embeddings — fall back to
keyword search for v1. Embeddings can be added in a follow-up.

### 7.1 Migration 242

```sql
-- migrations/242_tracy_corpus.sql
BEGIN;

-- Enable pgvector if not already (Supabase supports this out of the box)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS montree_tracy_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cross-pollination (school-scoped corpus only for v1).
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- The insight itself in plain English.
  insight_text TEXT NOT NULL CHECK (length(insight_text) BETWEEN 20 AND 2000),

  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'parent_archetype_signal',
    'cultural_pattern',
    'de_escalation_move',
    'trap_phrase',
    'voice_sample',
    'topic_pattern',
    'school_specific'
  )),

  -- Scope: who/what this applies to. JSONB so we can match flexibly.
  -- Shape: { "parent_id": "...", "archetype": "...", "cultural_group": "..." }
  applies_to JSONB NOT NULL DEFAULT '{}',

  -- Provenance.
  source_meeting_id UUID REFERENCES montree_parent_meetings(id) ON DELETE SET NULL,
  source_thread_id UUID REFERENCES montree_message_threads(id) ON DELETE SET NULL,

  -- Confidence (Sonnet self-rated, adjusts over time).
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.70 CHECK (confidence BETWEEN 0 AND 1),

  -- Usage telemetry — drives pruning.
  reference_count INTEGER NOT NULL DEFAULT 0,
  last_referenced_at TIMESTAMPTZ,

  -- Supersede chain (same pattern as Tracy's memory).
  superseded_by UUID REFERENCES montree_tracy_corpus(id) ON DELETE SET NULL,
  superseded_at TIMESTAMPTZ,

  -- Embedding for semantic search (text-embedding-3-small = 1536 dims).
  embedding vector(1536),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMPTZ -- set when principal explicitly approves
);

-- Active-corpus index (excludes superseded entries).
CREATE INDEX IF NOT EXISTS idx_tracy_corpus_active
  ON montree_tracy_corpus (school_id, insight_type)
  WHERE superseded_at IS NULL;

-- Most-recent + most-referenced index for ranking.
CREATE INDEX IF NOT EXISTS idx_tracy_corpus_ranking
  ON montree_tracy_corpus (school_id, last_referenced_at DESC NULLS LAST, reference_count DESC)
  WHERE superseded_at IS NULL;

-- Vector similarity index (HNSW for fast ANN search).
CREATE INDEX IF NOT EXISTS idx_tracy_corpus_embedding
  ON montree_tracy_corpus USING hnsw (embedding vector_cosine_ops)
  WHERE superseded_at IS NULL;

COMMIT;
```

### 7.2 Background extraction

**New module:** `lib/montree/tracy/corpus/extract.ts`

```typescript
// extractCorpusFromAnalysis(analysisId, supabase, anthropic)
//   → reads the analysis row, calls Sonnet to refine + abstract the
//     corpus_extractions array into proper insights, writes them to
//     montree_tracy_corpus with embeddings.
//
// Triggered manually for v1. Phase E (or a future iteration) wires
// a cron to fire automatically after each analysis lands.
```

Critical: the extraction Sonnet call MUST abstract away from specifics.
"Mrs Chen calmed when we showed Hannah's progression" becomes "with
expectation-driven parents at this school, showing the older sibling's
academic progression has de-escalated reading concerns 2/2 times."

### 7.3 Embedding generation

**New module:** `lib/montree/tracy/corpus/embeddings.ts`

```typescript
// embedText(text) → returns 1536-dim float array via OpenAI's
// text-embedding-3-small.
//
// Cost: ~$0.00002 per insight. Negligible.
```

### 7.4 Search tool

**New module:** `lib/montree/tracy/corpus/search.ts`

```typescript
// searchCorpus({ schoolId, query, parentId?, archetype?, limit? })
//   → embed query → cosine similarity search via pgvector → return
//     top-N entries above similarity threshold (0.75)
//   → bump reference_count + last_referenced_at on returned entries
```

### 7.5 Tracy tool

**Add to** `lib/montree/tracy/tool-definitions.ts`:

```typescript
{
  name: 'search_corpus',
  description:
    "Retrieve school-specific insights Tracy has learned over time. Use when preparing for a parent meeting, drafting a parent response, or answering any question where past patterns at THIS school would inform the answer. Examples: 'what's worked with Mrs Chen before?', 'what should I avoid with expectation-driven parents at our school?', 'have we had this kind of meeting before?'. Returns up to 10 relevant insights with their source meeting + confidence.",
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      parent_id: { type: 'string' },
      archetype: {
        type: 'string',
        enum: ['expectation_driven', 'anxiety_projecting', 'hands_off', 'comparison_trapped', 'defended'],
      },
    },
    required: ['query'],
  },
},
```

Dispatch case in `tool-executor.ts`. School-scoped via `deps.schoolId`.

### 7.6 RAG injection into prepare_parent_meeting

After parent profile loads (Phase A), also call `searchCorpus` with the
parent's archetype + the meeting purpose as the query. Inject results
into the dossier prompt as a new section:

```
# CORPUS — what's worked at this school before
{top 5 relevant insights with source meeting refs}
```

### 7.7 Phase C audit gate

- [ ] Migration 242 ran (including `CREATE EXTENSION vector`)
- [ ] Embedding generation works for at least 3 sample insights
- [ ] Cosine similarity search returns relevant results
- [ ] Cross-pollination: search is hard-scoped to `school_id`
- [ ] Reference count bumps on retrieval
- [ ] Extraction job refines + abstracts (verify by reading output —
      no PII leaking in)
- [ ] Tracy actually USES corpus retrieval in at least one test
      conversation

### 7.8 Phase C commit + push

Single commit. `Ultimate Tracy Phase C: self-improving corpus + RAG`

---

## 8. Phase D — Parent Surface UI

**Goal:** principal sees parents as first-class entities in the nav. Per-
parent timeline. Before-meeting prep screen. After-meeting review.

**Effort:** ~1.5 days condensed. Aim for 1.5-2 hours.

**Minimum viable demonstration:** Parents tab in nav, per-parent page
loads, shows profile + meeting list. Skip the timeline UX polish.

### 8.1 New routes / pages

- `app/montree/admin/parents/page.tsx` — list view of all parents in
  school with archetype tags + last meeting date + search.
- `app/montree/admin/parents/[parentId]/page.tsx` — per-parent page.
  Profile card + meeting list + Tracy's read (summary) + "Onboard" /
  "Record meeting" / "Prepare for meeting" actions.
- `app/montree/admin/parents/[parentId]/meetings/[meetingId]/page.tsx` —
  per-meeting detail. Summary + structured analysis + transcript (with
  decrypt-on-demand). Edit outcome notes inline.

### 8.2 Nav update

Add "Parents" tab to `app/montree/admin/layout.tsx` (or wherever the
principal nav lives — verify path against current state). Position
between "People" and "Pulse" so the relational entities sit together.

### 8.3 Tracy nav integration

When Tracy returns a `get_parent_profile` or `list_parents_for_school`
result, the UI should render the parent name as a clickable link to
`/montree/admin/parents/[parentId]`. Same pattern as child links work
today.

### 8.4 Phase D audit gate

- [ ] All new pages render without crashes
- [ ] Search on parent list works
- [ ] Decrypt-on-demand for transcripts works (NEVER show ciphertext)
- [ ] Mobile-first viewport tested at 375px
- [ ] Cross-pollination: page 404s for parents not in current school

### 8.5 Phase D commit + push

Single commit. `Ultimate Tracy Phase D: Parents tab + per-parent UI`

---

## 9. Phase E — Privacy + Polish

**Goal:** the unglamorous load-bearing work that makes the feature
shippable to real schools without legal exposure.

**Effort:** ~1 day condensed. Aim for 1-1.5 hours.

**Minimum viable demonstration:** consent flag on parent, data-export
endpoint, deletion audit log. Skip the corpus quality monitor.

### 9.1 Migration 243

```sql
-- migrations/243_parent_consent_flags.sql
BEGIN;

ALTER TABLE montree_parents
  ADD COLUMN IF NOT EXISTS recording_consent_on_file BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recording_consent_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recording_consent_set_by UUID;

COMMIT;
```

### 9.2 Routes

- `GET /api/montree/admin/parents/[parentId]/export` — returns ALL
  parent data (profile + meetings + transcripts decrypted + analyses)
  as JSON. For GDPR/CCPA requests.
- `DELETE /api/montree/admin/parents/[parentId]` — soft-delete cascade.
  Logs to a new `montree_parent_deletion_audit` table.

### 9.3 Consent gate enforcement

Phase B's record button is DISABLED unless
`montree_parents.recording_consent_on_file = TRUE`. UI gate + server
gate (defence in depth).

### 9.4 Corpus quality monitor

Super-admin page at `/montree/super-admin/tracy-corpus` shows:
- Total corpus entries per school
- Most-referenced insights
- Never-referenced (>30 days old) — pruning candidates
- Recently superseded insights

### 9.5 Phase E audit gate

- [ ] Consent flag enforced on both UI + server
- [ ] Data-export returns complete data (verified by spot-check)
- [ ] Deletion cascade leaves zero orphan rows (verify with
      `SELECT COUNT(*) FROM <every related table> WHERE parent_id=...`)
- [ ] Super-admin corpus monitor loads

### 9.6 Phase E commit + push

Single commit. `Ultimate Tracy Phase E: privacy + corpus monitor`

---

## 10. Cross-cut audit + final verification (Phase F)

**Goal:** three consecutive clean audit passes across the entire build
before declaring done.

**Effort:** ~30-45 min.

### 10.1 Pass 1 — Lint clean across ALL touched files

```bash
npx eslint --max-warnings=0 \
  $(git diff --name-only HEAD~10 HEAD | grep -E '\.(ts|tsx)$' | tr '\n' ' ')
```

### 10.2 Pass 2 — i18n strict parity

```bash
node scripts/check-i18n-completeness.mjs --strict
```

Should pass 12/12 at 100%. If new UI strings were added, batch-fill
non-zh locales via `npm run i18n:fill-ui`.

### 10.3 Pass 3 — Architecture invariants

Grep checks:
- [ ] Every new query has `school_id` filter (grep for `from('montree_` in new files)
- [ ] No Storage uploads in transcribe routes (grep `storage.from` in new transcribe code → should be empty)
- [ ] No plaintext transcript writes (grep for inserts to `transcript_text` → should always be `transcript_text_encrypted`)
- [ ] Every new tool dispatched (compare tool-definitions names to tool-executor cases)
- [ ] Every new route auth-gated (grep for `verifySchoolRequest` in route handlers)

### 10.4 Final commit + push

Catch-all commit if any audit fixes were needed. Title:
`Ultimate Tracy cross-cut audit fixes + Session N closeout`

### 10.5 Update CLAUDE.md

Append to the `## RECENT STATUS` section at the top of CLAUDE.md a
new entry for this session summarising:
- Migrations run (238-243)
- New tables (5)
- New tools (3-4)
- New UI surfaces (4-5)
- Architectural rules added (~10)
- Carry-overs for next session

---

## 11. Carry-overs (for Tredoux to handle in the morning)

If the build completes successfully, Tredoux needs to:

1. **Run migrations 238-243 in Supabase SQL Editor.** Order matters —
   238 first, then 239, 240, 241, 241b, 242, 243.
2. **Verify each migration with the SELECT queries** documented at
   the bottom of each migration file.
3. **Walk the 10-step verification checklist** below.

If the build runs out of time and ships partial, the carry-overs are
the specific phase/section that didn't complete plus what state was
left in.

### Verification checklist (Tredoux walks this in the morning)

1. **Onboard a test parent via voice.** Tap "Onboard parent" on a
   parent who has no profile. Speak a 60-second description. Verify
   Sonnet structures it into the right fields. Save.
2. **Verify the profile shows on the parent page.**
3. **Prepare a parent-meeting dossier for that parent.** Verify the
   dossier visibly uses profile data (right archetype, right cultural
   register, right triggers in the DON'T-SAY list).
4. **Record a 2-minute mock meeting.** Verify consent gate, recording
   indicator, transcript saves encrypted, analysis returns structured.
5. **Review the profile-update proposals.** Approve some, edit one,
   dismiss one. Verify profile updates persist correctly.
6. **Check Supabase: transcript IS encrypted** —
   `SELECT LEFT(transcript_text_encrypted, 20) FROM montree_parent_meeting_transcripts;`
   should start with `gcm:`.
7. **Verify audio never persisted** —
   `SELECT COUNT(*) FROM storage.objects WHERE bucket_id = '...' AND name LIKE '%meeting%audio%';`
   should be 0.
8. **Ask Tracy in chat: "what should I watch out for with [parent name]?"**
   Verify she calls `get_parent_profile` AND `search_corpus`, and her
   answer uses both.
9. **Check the Parents tab in nav.** Verify list view + per-parent
   page works.
10. **Check super-admin corpus monitor.** Verify entries appear.

---

## 12. Commit strategy + refresh hints

**Commit frequently.** Each phase = at least one commit, ideally
2-4. If the agent dies mid-phase, previous phases are preserved on
`main` and the next session can pick up cleanly.

**Refresh checkpoints** at phase boundaries:
- After Phase A — refresh if context > 60%
- After Phase B — refresh if context > 70% (Phase B is the biggest)
- After Phase C — refresh if context > 60%
- After Phase D — usually fine to continue
- After Phase E — wrap up Phase F and ship

**To refresh:** commit + push current state, write a brief status
update in this handoff doc under "Progress Log", save & quit. Next
session reads this doc, identifies the next phase, picks up.

---

## 13. Progress Log

> The agent updates this section as it works. Each phase gets a
> short status line: COMPLETED / PARTIAL (with what's left) /
> SKIPPED (with why).

- Phase A — **COMPLETED** (commit `15795141` on `origin/main`). Migration 238 pending Tredoux's Supabase run. 11 files, +2976 lines. Lint clean. Two new tools wired into Tracy. Dossier integration live with PARENT PROFILE block + Section 5 calibration rules.
- Phase B — **COMPLETED** (commit `07c0e73d` on `origin/main`). Migrations 239/240/241 pending Supabase run. 10 files. Lint clean. Recording UI + chunked Whisper + AES-256-GCM encrypted persistence + Sonnet analysis with structured tool_use + per-field Approve/Edit/Dismiss review workflow. Audio never persists. Consent gate enforced server + UI.
- Phase C — **COMPLETED** (commit `6b7fedf7` on `origin/main`). Migrations 242 + 242b pending Supabase run. 8 files. Lint clean. pgvector HNSW + cosine search via SECURITY DEFINER RPCs. Auto-extract fires after every analysis. RAG injected into prepare_parent_meeting.
- Phase D — **COMPLETED** (commit `ea391dc3` on `origin/main`). 15 files. Parents tab in nav, parent list with filters, per-parent page with profile card + meeting history + actions. i18n parity 12/12 at 100%. Two pre-existing layout.tsx setState-in-effect warnings flagged as NOT introduced by this phase.
- Phase E — **COMPLETED** (commit `ae25cb51` on `origin/main`). Migration 243 pending Supabase run. 5 files. Lint clean. Consent flag column + audit table + data-export endpoint + delete-with-audit + super-admin corpus monitor (route + page).
- Phase F — _in progress_

---

## 14. Final words for the agent

This is ambitious. Move fast. Audit clean. Don't re-debate decisions
that are locked in Section 3. Don't ask permission for things in
this plan — execute them.

If you hit a blocker that requires Tredoux's input (a decision he
didn't make in advance), STOP. Document the blocker in the Progress
Log. Save state. Commit + push what you have. Don't guess.

If you complete the full build: write the CLAUDE.md status entry,
draft the next-morning verification checklist, push, and exit
cleanly. Tredoux wakes up to The Ultimate Tracy.

If you complete part of it: be honest about what landed. The next
session will pick up exactly where you left off because this doc
told them where that is.

Tracy's relational mind is the headline feature for Principal Leu's
introduction to real schools. Get it right.

— Handoff written May 28, 2026 by the agent who built Tracy v2
   psychological mind earlier that same evening.
