# Handoff: Voice Observation System — Mar 4, 2026

## Status: ✅ DEPLOYED + ENABLED for Beijing International

## Summary

Premium ($1000/month) hands-free classroom observation system. Teachers wear a DJI Mini Mic, record 2-3 hour Montessori work cycles, and the system automatically:
1. Transcribes audio (OpenAI Whisper, $0.006/min)
2. Identifies students by name (Jaro-Winkler fuzzy matching, 0.85 threshold)
3. Matches works to the 329-work curriculum (existing `matchWork()` from fuzzy-matcher.ts)
4. Proposes progress updates via Claude Haiku tool_use
5. Teacher reviews extractions at end-of-day, approves/rejects/edits, then commits

**Privacy:** ALL audio and transcripts permanently deleted after teacher commits. No one can ever access raw recordings.

## Architecture

### Database (2 migrations)

**Migration 134** (`134_feature_toggles_and_raz_tracker.sql`):
- `montree_feature_definitions` — Master feature list (6 seeded: raz_reading_tracker, weekly_plan_upload, daily_reports, parent_portal, games, voice_observations)
- `montree_school_features` — School-level toggles
- `montree_classroom_features` — Classroom-level toggles
- `raz_reading_records` — Daily RAZ reading tracker (separate feature)

**Migration 135** (`135_voice_observations.sql`):
- `voice_observation_sessions` — Recording sessions with status state machine
- `voice_observation_extractions` — AI-proposed observations (child, work, status, confidence)
- `voice_observation_audio_chunks` — 60-second audio segments stored in `voice-obs` private bucket
- `voice_observation_student_aliases` — Learned nickname→child mappings

### Status State Machine
```
recording → paused → recording (toggle)
recording/paused → queued → transcribing → analyzing → ready_for_review → committed
                                                     ↘ failed
                                                     ↘ expired (24hr TTL)
```

### Processing Pipeline (fire-and-forget)
1. Teacher clicks "Finish" → `end/route.ts` sets status to `queued`, fires `processSession()` as background Promise
2. `processSession()` (audio-processor.ts):
   - Downloads all chunks from Supabase Storage
   - Transcribes via Whisper (first chunk sequential for language detection, rest parallel)
   - Merges transcripts, stores full_transcript on session
3. `analyzeTranscript()` (observation-analyzer.ts):
   - Splits transcript into ~2000-word segments with 200-word overlap
   - Each segment → Claude Haiku with tool_use (`record_observations` tool)
   - Haiku returns structured observations: child name, work, status, confidence, notes
   - Student names matched via Jaro-Winkler (student-matcher.ts)
   - Works matched via existing `matchWork()` (fuzzy-matcher.ts)
4. Extractions stored in DB, session status → `ready_for_review`

### Cost Estimates
- Whisper: $0.006/min → 2hr session = $0.72
- Haiku analysis: ~$0.02-0.05 per segment, ~5-10 segments = $0.10-0.50
- **Total per session: ~$0.80-$1.25**

## Files Created (20 new)

### Core Libraries (4 files)
- `lib/montree/voice/audio-processor.ts` (~344 lines) — Transcription orchestrator, cost calculator, cleanup, session processor
- `lib/montree/voice/observation-analyzer.ts` (~303 lines) — AI analysis pipeline, transcript segmentation, extraction consolidation
- `lib/montree/voice/student-matcher.ts` (~170 lines) — Jaro-Winkler name matching, alias learning
- `lib/montree/voice/prompts.ts` (~175 lines) — Haiku system prompt, tool definition
- `lib/montree/voice/index.ts` (~8 lines) — Barrel exports

### API Routes (9 files)
- `app/api/montree/voice-observation/start/route.ts` (~86 lines) — POST: create session (auth + feature toggle check + cleanup)
- `app/api/montree/voice-observation/[sessionId]/upload/route.ts` (~160 lines) — POST: chunked audio upload (rate limit 60/min, 5MB/chunk, 200MB/session)
- `app/api/montree/voice-observation/[sessionId]/pause/route.ts` (~72 lines) — POST: toggle recording↔paused (with status validation)
- `app/api/montree/voice-observation/[sessionId]/end/route.ts` (~111 lines) — POST: end + fire-and-forget processSession()
- `app/api/montree/voice-observation/[sessionId]/status/route.ts` (~77 lines) — GET: poll status + cleanup expired
- `app/api/montree/voice-observation/[sessionId]/review/route.ts` (~81 lines) — GET: extractions grouped by child
- `app/api/montree/voice-observation/extraction/[extractionId]/route.ts` (~198 lines) — PATCH: approve/reject/edit + batch operations
- `app/api/montree/voice-observation/[sessionId]/commit/route.ts` (~162 lines) — POST: commit to progress + DELETE audio/transcripts
- `app/api/montree/voice-observation/history/route.ts` (~49 lines) — GET: past sessions metadata

### Frontend (6 files)
- `app/montree/dashboard/voice-observation/page.tsx` (~288 lines) — 6-state machine page (idle→recording→paused→processing→review→committed)
- `components/montree/voice-observation/VoiceObservationRecorder.tsx` (~311 lines) — Recording UI with MediaRecorder, 60s chunks, pause/resume
- `components/montree/voice-observation/VoiceObservationProgress.tsx` (~132 lines) — Processing progress poller
- `components/montree/voice-observation/VoiceObservationReview.tsx` (~259 lines) — Review + batch approve + commit
- `components/montree/voice-observation/ExtractionCard.tsx` (~225 lines) — Individual extraction card with inline editing

## Files Modified (4)

- `migrations/134_feature_toggles_and_raz_tracker.sql` — Added `voice_observations` to feature seed
- `components/montree/DashboardHeader.tsx` — Added 🎙️ nav link (gated: `!isHomeschoolParent()`)
- `lib/montree/i18n/en.ts` — ~57 `voiceObs.*` keys
- `lib/montree/i18n/zh.ts` — ~57 matching Chinese translations

## Build Methodology

3 plan-audit cycles (completed prior sessions) + 3 build-audit cycles:

| Cycle | Issues Found | Severity |
|-------|-------------|----------|
| Audit 1 | 7 | 1 CRITICAL (upload race condition), 2 HIGH (property mismatches, pause timer), 1 HIGH (Node 18 Blob compat), 2 MEDIUM (language detection race, i18n), 1 LOW (loading state) |
| Audit 2 | 2 | 1 MEDIUM (pause route status validation), 1 LOW (i18n "Committing...") |
| Audit 3 | 0 | All clean |
| **Total** | **9** | All fixed |

## Key Design Decisions

- **Fire-and-forget Promises** — Railway runs persistent Node.js, background Promises survive HTTP response. `export const maxDuration = 300` for long-running routes.
- **Check-on-access cleanup** — No cron on Railway, so expired sessions cleaned when routes are accessed
- **Feature toggle gating** — Checks `montree_school_features` table for `voice_observations` enabled
- **Cross-pollination security** — All routes verify session belongs to authenticated school
- **Blob instead of File** — Node.js 18 compatibility (File constructor not available)
- **Sequential first-chunk transcription** — Detects language before parallel processing remaining chunks

## Deploy Status

- ✅ Code pushed to GitHub (`005bc94a`)
- ✅ Railway build deployed
- ✅ Migration 134 run (feature toggles + RAZ tracker)
- ✅ Migration 135 run (voice observation tables + storage bucket)
- ✅ Voice Observations enabled for Beijing International school
- ✅ API responding correctly in production

## Testing

To test:
1. Log in as a Whale Class teacher
2. 🎙️ Voice Observation link should appear in dashboard header
3. Click it → should show premium feature page with "Start Recording"
4. Record audio → upload chunks → finish → processing → review → commit

## Plan File

`.claude/plans/cryptic-tumbling-turing.md`
