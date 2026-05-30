# Astra & Mira — System Architecture

**Created:** May 30, 2026 · **Status:** ARCHITECTURE (lock before building out)
**Companions:** `ASTRA_MIRA_VOICE_REALTIME_HANDOFF.md` (why/what),
`ASTRA_MIRA_EXECUTION_SPEC.md` (increment-by-increment how).

This is the system design for the full arc: hands-free multilingual voice
Astra that acts; a live meeting co-pilot; a home learning program with
children's oral reading; shared memory; multimodal presentation. It is
grounded in an audit of the real codebase (May 30, 2026).

---

## 1. Design principles (carried from the live system)
1. **Reuse before rebuild.** Agora transport, token minting, Whisper, the
   Astra/Mira tool-loops, encryption, consent, and the curriculum graph all
   already exist. New work wires them together; it does not reinvent them.
2. **Feature-flagged + OFF by default.** Every new capability gates on
   `isFeatureEnabled(supabase, schoolId, '<flag>')` (DB-driven) — inert in
   production until switched on per school.
3. **School-scoped everything.** Every read/write filters `auth.schoolId`;
   cross-school access is impossible even with a guessed id.
4. **Suggest, then act on confirm.** Agents never take irreversible or social
   actions (appointments, messages, calls) without explicit human confirmation.
5. **Audio is ephemeral.** Speech is processed in-memory and dropped; only
   encrypted transcripts persist, and only with consent.
6. **Co-locate + tier the model.** Railway + Supabase in Singapore (latency);
   Haiku for fast/live paths, Sonnet/Opus for depth, via `resolveReportModel()`.

---

## 2. Component map

```
┌────────────────────────────── CLIENTS ──────────────────────────────┐
│  Principal (web /montree/admin + Capacitor mobile)                   │
│  Parent / Student (home learning surface)   Sales agent (Mira)       │
└───────────────┬───────────────────────────────────┬─────────────────┘
                │                                     │
        ┌───────▼─────────┐                   ┌───────▼─────────┐
        │ AGORA (existing)│                   │  Next.js API    │
        │ • RTC SDK (web) │  voice media      │  (Railway, SG)  │
        │ • agora-token   │◄────────────────► │                 │
        │ • Conversational│                   │  Route handlers │
        │   AI Engine     │  agent join/leave │  + lib/montree  │
        │   (REST: CUSTOMER│◄────────────────►│                 │
        │   _KEY/SECRET)  │                   │                 │
        └───────┬─────────┘                   └───────┬─────────┘
                │ STT/TTS + turn-taking               │
        ┌───────▼──────────────────────────────────── ▼───────────────┐
        │                     THE BRAIN(S)                              │
        │  Astra: principal-agent/route.ts + lib/montree/tracy/         │
        │         tool-executor.ts (internalGet @127.0.0.1)             │
        │  Mira:  agent/mira/route.ts                                   │
        │  Co-pilot: parent-meetings/[id]/copilot/route.ts (Haiku)      │
        │  Tutor:  home-learning tutor (NEW, Mira-style, lesson-scoped) │
        └───────┬───────────────────────────────────────────┬─────────┘
                │ tools                                       │ retrieval
        ┌───────▼─────────┐                          ┌────────▼─────────┐
        │  ACTION TOOLS   │                          │   MEMORY/GROUND  │
        │ appointments,   │                          │ parent profiles, │
        │ messages,       │                          │ tracy_corpus     │
        │ child lookups,  │                          │ (pgvector),      │
        │ get_child_photos│                          │ learner state    │
        │ (+confirm gate) │                          │ (NEW), curriculum│
        └─────────────────┘                          │ graph (lesson    │
                                                      │ map+materials)   │
                                                      └──────────────────┘
        ┌──────────────────────────────────────────────────────────────┐
        │ CROSS-CUT: encryption (MESSAGE_ENCRYPTION_KEY), consent flags, │
        │ feature flags, resolveReportModel tiering, eval traces         │
        └──────────────────────────────────────────────────────────────┘
```

---

## 3. What EXISTS vs what's NEW (audited)

**Exists (reuse):**
- Agora: `agora-rtc-sdk-ng`, `agora-token`; `lib/montree/appointments/agora/
  token-builder.ts` (`channelForAppointment`, `buildJoinToken`), `…/agora/
  config.ts` (`isAgoraConfigured`); `components/montree/appointments/
  AgoraVideoCall.tsx`; `…/appointments/[id]/agora-token/route.ts`. Env:
  `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `AGORA_CUSTOMER_KEY`,
  `AGORA_CUSTOMER_SECRET`, `AGORA_RECORDING_BUCKET`, `NEXT_PUBLIC_AGORA_AREA`.
- Brains: Astra (`principal-agent/route.ts` + `lib/montree/tracy/tool-executor.ts`),
  Mira (`agent/mira/route.ts`). Tool-loop + prompt caching + streaming.
- Speech-to-text: `openai` SDK + `lib/montree/parent-meeting/transcribe.ts`
  (Whisper, in-memory, encrypted on finalize).
- Memory/ground: `montree_parent_profiles`, `montree_tracy_corpus` (pgvector,
  `242_tracy_corpus.sql` + `242b` search fn), `parent-profile/loader.ts`,
  curriculum graph (`lesson-map.ts`, `lesson-materials.ts`, `phonics-fast/*`,
  `library/lesson/[lesson]/page.tsx`).
- Meeting pipeline: `transcribe-chunk` → `analyse` → `proposals`.
- Crypto/consent: `messaging-crypto.ts` (`MESSAGE_ENCRYPTION_KEY`),
  `243_parent_consent_flags.sql`.
- **NEW this arc, already built + committed (branch):** live co-pilot endpoint
  `parent-meetings/[id]/copilot/route.ts` + `copilot-prompt.ts` (Haiku,
  flag `live_copilot`).

**New (to build):**
- **Voice session layer:** `lib/montree/voice/` — a voice-channel token helper
  (reusing `agora-token`) + an **agent-start/stop** service that calls Agora
  Conversational AI Engine REST (`AGORA_CUSTOMER_KEY/SECRET`) to drop the Astra
  agent into the principal's channel, configured with the Astra tool set.
- **Voice brain binding:** route Agora STT → the EXISTING Astra tool-loop →
  TTS. Brain options: Agora-native LLM binding, or OpenAI Realtime (the `openai`
  SDK is already present) behind Agora transport. Decide at build time by
  latency/quality/cost test.
- **Action tools with confirm:** appointment-create + message-send tools that
  return a confirmation payload spoken/shown before executing (reuse
  `lib/montree/appointments/*`).
- **Co-pilot UI:** side panel on `…/meetings/[meetingId]/page.tsx` (i18n 12/12),
  parallel listener feeding `/copilot`.
- **Learner memory:** `montree_child_learning_state` table + `lib/montree/
  learner/loader.ts` (mirrors `parent-profile/loader.ts`).
- **Home learning + oral reading:** student surface + a miscue-alignment layer
  (Whisper or a specialist reading-ASR) against the lesson's target text +
  Socratic micro-interventions; reuse `lesson-materials.ts` + `phonics-fast`.
- **Multimodal layer:** synced visuals (word highlight, miscue animation).

---

## 4. Key sequence flows

**A. Hands-free voice command ("book 3pm with Yo-Yo's mother")**
1. Client opens an Agora voice channel (token via new voice-token route, reusing
   `agora-token`).
2. App calls agent-start (Conversational AI REST, `CUSTOMER_KEY/SECRET`) → Astra
   agent joins the channel with the Astra tool set + multilingual TTS.
3. Principal speaks → Agora STT → Astra tool-loop reasons → calls
   `create_appointment` tool → tool returns a CONFIRM payload.
4. Astra speaks back "Shall I book 3pm with Yo-Yo's mother?" → on "yes", the tool
   executes via `lib/montree/appointments/*` (server, 127.0.0.1 internal).
5. Confirmation spoken; transcript optional + ephemeral.

**B. Live meeting co-pilot (built, backend)**
1. Meeting UI streams short audio chunks to `transcribe-chunk` (in-memory).
2. Rolling text posted to `/copilot` → Haiku returns next-best response.
3. Side panel renders it; principal reads/speaks; never auto-sent.
4. Post-meeting: existing `analyse` + `proposals` produce the durable record;
   corpus extraction feeds `tracy_corpus` (memory compounding).

**C. Home oral reading**
1. Student opens reader for their `current_lesson` (lesson-materials resolver).
2. Child reads aloud → STT → align to the lesson's known target words → detect
   miscue (substitution/omission/self-correction).
3. On miscue, tutor gives a Socratic, sound-specific prompt; logs to learner
   state. Audio dropped.

---

## 5. Data model (existing + new)
- **Existing:** `montree_parents`, `montree_children`, `montree_parent_profiles`,
  `montree_parent_meetings`, `montree_parent_meeting_transcripts`,
  `montree_parent_meeting_analyses`, `montree_tracy_corpus` (pgvector),
  appointments + `montree_appointment_hosts`. Child carries `current_lesson` /
  `mastered_lessons`.
- **New migrations (follow the carry-forward + migration_pending pattern):**
  - `244_child_learning_state.sql` — per-child mastery signals, miscue history,
    preferences (feeds tutor + reports).
  - `245_voice_sessions.sql` (optional) — voice session audit (start/stop, lang,
    actions taken w/ confirm), NO audio, NO raw transcript.
- **Pending (must run before meeting/voice memory is full):** 237–243.

---

## 6. Security, privacy, consent
- Audio never persisted (voice + oral reading) — in-memory, dropped.
- Transcripts encrypted (`MESSAGE_ENCRYPTION_KEY`, `gcm:` prefix); consent-gated.
- Live co-pilot recording a real conversation needs everyone's consent — reuse
  `243_parent_consent_flags` + UI gate.
- Confirm-before-act on appointments/messages/calls; calls (Phase 6) also need
  allowlist + legal check.
- School-scoping + role checks (`verifySchoolRequest`) on every route.
- Child data stays in-system; oral-reading audio of minors is highest-sensitivity.

---

## 7. Config / env (all Agora vars already in Railway per Tredoux + live video feature)
`AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `AGORA_CUSTOMER_KEY`,
`AGORA_CUSTOMER_SECRET`, `AGORA_RECORDING_BUCKET`, `NEXT_PUBLIC_AGORA_AREA`,
`ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (Whisper / optional Realtime),
`MESSAGE_ENCRYPTION_KEY`, Supabase keys. `isAgoraConfigured()` already guards.

---

## 8. Readiness verdict — do we have what we need to build?
- **Voice Astra:** 🟢 Foundation present (Agora SDK+token+config+customer keys).
  Build = voice-token route + agent-start service + brain binding + confirm
  tools. The only thing I can't do from here is the **on-device latency/voice
  test** — that's yours.
- **Live co-pilot:** 🟢 Backend built; needs the UI panel + i18n (no vendor).
- **Memory:** 🟢 Corpus+profiles exist; add learner-state table+loader.
- **Home oral reading:** 🟠 Architecture ready; the **miscue-accuracy spike on
  real children** is the gate + the one possible vendor decision.
- **Migrations:** ⚪ 237–243 (+ new 244/245) must be run by you/Tredoux.

**Bottom line: yes — the architecture is complete and the foundations are
mostly already in the repo. Building can proceed.** Hard external items only:
on-device voice test, the oral-reading accuracy spike, and running migrations.
