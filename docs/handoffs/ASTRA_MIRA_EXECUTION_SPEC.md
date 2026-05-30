# Astra & Mira — Execution Spec (top-to-bottom build)

**Companion to** `ASTRA_MIRA_VOICE_REALTIME_HANDOFF.md` (the why/what).
This is the **how** — every increment, the exact files, and the **audit gate**
that must pass before each commit. Build order is chosen so each increment is
independently shippable, feature-flagged OFF by default, and auditable.

**Global rules (apply to EVERY increment):**
- Work on branch `astra-voice-copilot`, NOT `main` (main auto-deploys to Railway).
- Every new capability is gated by `isFeatureEnabled(supabase, schoolId, '<flag>')`
  — DB-driven, so it's OFF in production until a row enables it.
- Every Sonnet/Opus call tier-gates via `resolveReportModel()`; fast paths use
  `HAIKU_MODEL`.
- Server-to-self HTTP uses `http://127.0.0.1:${PORT}` (never public origin).
- Audio is NEVER persisted (reuse the meeting pipeline's in-memory-drop rule).
- All user-facing strings go through i18n (strict 12/12 locales).
- **AUDIT GATE per increment:** `npx eslint <files> --max-warnings=0` → read the
  full diff end-to-end (incl. mobile/Capacitor + iOS) → verify the flag defaults
  OFF → confirm no existing route's behaviour changed → only then commit.

---

## Building blocks that already exist (reuse, don't rebuild)
- `lib/ai/anthropic.ts` → `anthropic`, `AI_MODEL` (sonnet-4-6), `OPUS_MODEL`,
  `HAIKU_MODEL` (haiku-4-5), `getModelForTier`.
- `lib/montree/features/server.ts` → `isFeatureEnabled(supabase, schoolId, flag)`.
- `lib/montree/reports/resolve-model.ts` → `resolveReportModel()`.
- `lib/montree/parent-meeting/transcribe.ts` → `recordChunk`, `finalizeAndDrain`,
  `transcribeAudioBlob` (Whisper).
- `lib/montree/parent-meeting/analysis-prompt.ts` → `buildAnalysisSystemPrompt`,
  `PARENT_MEETING_ANALYSIS_TOOL`.
- `lib/montree/parent-profile/loader.ts` → `loadParentProfile`.
- `lib/montree/messaging-crypto.ts` → `encryptField`, `readEncryptedField`,
  `isEncryptionConfigured`.
- `lib/montree/verify-request.ts` → `verifySchoolRequest` (school-scoping).
- Astra brain: `app/api/montree/admin/principal-agent/route.ts` + `lib/montree/tracy/`
  (`tool-executor.ts`). Mira: `app/api/montree/agent/mira/route.ts`.
- Curriculum: `english-sequence/lesson-map.ts`, `lesson-materials.ts`,
  `library/lesson/[lesson]/page.tsx`, `phonics-fast/*`.

---

## INCREMENT 1 — Live meeting co-pilot (no new vendor; ship first)
**Flag:** `live_copilot`. **Goal:** during a meeting, surface a pre-drafted
next-best response in a side panel, with zero delay to the live conversation.
- **1a. Suggestion endpoint** — NEW `app/api/montree/admin/parent-meetings/
  [meetingId]/copilot/route.ts`. POST body: rolling transcript window (last N
  turns, plain text, NOT persisted) + meetingId. Mirrors `analyse/route.ts` auth
  (`verifySchoolRequest`, school-scope re-verify), loads parent profile, calls
  **HAIKU_MODEL** for speed/cost, returns `{ suggestion, talking_points[],
  tone_flag }`. Gated by `isFeatureEnabled('live_copilot')` → `migration_pending`
  /disabled returns 200 with `enabled:false`.
- **1b. Live transcription** — extend the existing chunk flow: the client posts
  short rolling chunks to `transcribe-chunk` (already in-memory, encrypted on
  finalize) and feeds the running text to `/copilot`. Reuse `recordChunk`.
- **1c. Side panel UI** — add a co-pilot panel to
  `app/montree/admin/parents/[parentId]/meetings/[meetingId]/page.tsx`. Parallel
  listener: polls/streams `/copilot` as transcript grows; shows the suggestion +
  talking points; **suggest-only, never auto-send.** i18n all strings.
- **1d. Memory tie-in** — pass parent profile + (when migrations run) Tracy
  pgvector corpus hits into the suggestion prompt so it's personal.
- **Audit gate 1:** eslint 0/0; flag OFF in prod; existing post-hoc
  `analyse`/`proposals` untouched; audio still never persisted; i18n 12/12.

## INCREMENT 2 — Hands-free voice Astra (Agora; keys in hand)
**Flag:** `voice_astra`. **Goal:** principal speaks any language → Astra replies
in voice → Astra acts via existing tools.
- **2a. Agora token endpoint** — NEW `app/api/montree/admin/voice/token/route.ts`:
  mints an Agora RTC/`session` token from `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE`
  (env, Railway). School-scoped.
- **2b. Voice agent config** — register the principal-agent tools on Agora
  `session.tools` so the agent can call them mid-conversation; bridge tool calls
  to the EXISTING `lib/montree/tracy/tool-executor.ts` (keep `127.0.0.1` internal
  calls). Choose brain: Agora-native vs OpenAI Realtime/Gemini Live behind Agora.
- **2c. Action tools w/ confirm** — appointment + message tools must return a
  confirmation payload the UI/voice reads back ("Shall I book 3pm with Yo-Yo's
  mother?") before executing. Reuse existing appointments lib
  (`lib/montree/appointments/*`).
- **2d. Client** — mic capture + Agora web SDK on `/montree/admin` (and Capacitor
  for mobile); multilingual TTS voice; visible transcript.
- **2e. Audit gate 2:** eslint 0/0; flag OFF; **manual device test** (the part
  only Tredoux can do): real speech round-trip latency, multilingual, a booked
  appointment with confirm. No autonomous actions without confirm.

## INCREMENT 3 — Per-child learner memory (extends existing memory)
**Goal:** a durable learner model powering the tutor + reports.
- **3a. Schema** — migration: `montree_child_learning_state` (child_id,
  current_lesson already exists on child; add mastery signals, miscue history,
  preferences). Follow the pending-migration pattern (graceful `migration_pending`).
- **3b. Loader** — `lib/montree/learner/loader.ts` mirroring `parent-profile/
  loader.ts`. Feeds the tutor + co-pilot + Astra.
- **Audit gate 3:** migration reversible + documented in CLAUDE.md carry-forward
  list; loader school-scoped; degrades gracefully pre-migration.

## INCREMENT 4 — Home learning + oral reading (GATED on Phase 0 spike)
**Flag:** `home_learning`. **Goal:** student reads at home; tutor routes to the
right lesson and runs miscue-based micro-interventions.
- **4a. Oral-reading spike FIRST** (blocker): ~20 kids, real texts, measure
  miscue detection vs known target. Vendor trial → else kids-ASR + alignment.
- **4b. Reader surface** — student route reusing `current_lesson` +
  `lesson-materials.ts` to pick the reader/exercises; `phonics-fast` content.
- **4c. Miscue loop** — child reads aloud → ASR aligns to target words → on a
  miscue, Mira-style Socratic prompt on the exact sound. Audio not persisted.
- **4d. Audit gate 4:** spike accuracy bar met; child data school-scoped; consent;
  feedback < ~1s.

## INCREMENT 5 — Multimodal "wow" (#7)
- Sync visuals to tutor voice (word highlight, miscue animation, reward); calm
  Astra transcript+suggestion panel. Reuse existing media pipeline (Supabase
  `montree-media`, portrait encode rules). Audit: perf on mobile, no layout traps
  (use `createPortal(document.body)` for overlays — known Astra lightbox gotcha).

## INCREMENT 6 — Outbound calling (LAST, highest risk)
- Agora outbound-call API; consent + confirm + allowlist; full audit + legal check.

---

## Sequencing & what needs Tredoux
1. **Now:** Increment 1 (live co-pilot) — buildable + auditable with zero new
   vendor. Build on branch, audit gate 1, then you review the diff before merge.
2. **Parallel:** Increment 2 voice (you have Agora keys → set `AGORA_APP_ID` +
   `AGORA_APP_CERTIFICATE` in Railway; 2e device test is yours).
3. **Then:** 3 → 4 (gated on the oral-reading spike) → 5 → 6.
**Only-you items:** Agora env keys + device test (2e); oral-reading vendor + real-kid
spike (4a); running carry-forward migrations (238–243, and new 3a/4 migrations).
