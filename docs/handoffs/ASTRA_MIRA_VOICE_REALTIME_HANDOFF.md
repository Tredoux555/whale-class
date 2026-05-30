# Astra & Mira — Real-Time Voice + Live Co-Pilot + Home Learning

**Created:** May 30, 2026 · **Status:** PLAN / not started · **Owner:** Tredoux
**Read first:** `HANDOFF_LATEST.md`, then `CLAUDE.md` (Sessions 133–138), then this.

This is the build plan for the next big arc. It is **grounded in what already
exists** (Sessions 133–138). Most of it is *extending* shipped infrastructure,
not greenfield. Where something is genuinely new it says **NEW**.

---

## The vision (Tredoux, verbatim intent)

1. **Hands-free, multilingual Astra for the principal.** Principal speaks in any
   language — "set an appointment with Yo-Yo's mother for 3pm", "message so-and-so" —
   and Astra listens, replies in voice, and *does it*. No clicking, no typing.
   (Reference point: Agora's conversational agent.)
2. **A live conversation co-pilot.** During a real parent conversation, Astra/Mira
   listen, analyse on the fly, and pre-draft the next-best response in a side
   panel — so there's no "wait, what do I say?" The answer is already there.
3. **Home learning program.** Students read books + do curriculum-aligned
   exercises at home; the agent leads each student to the *correct lesson for
   their classroom level* (English first) and guides them through it.
   Oral-reading speech recognition is the highest-leverage piece.
4. **Memory** that makes all of the above personal (Tredoux: "Number 5 is big").
5. **Multimodal "wow"** (Tredoux: "Number 7 is huge") — voice + visuals together.

---

## What ALREADY EXISTS (audited May 30, 2026 — build on this, don't rebuild)

- **Astra = the principal's chief-of-staff AI.** `app/api/montree/admin/principal-agent/route.ts`
  (1044 lines): Sonnet via `resolveReportModel()` tier-gating, a tool-use loop
  (`MAX_TOOL_ROUNDS=5`), prompt caching (`cache_control: ephemeral` on the
  tools+system prefix), streaming, empty-response recovery. Underlying engine in
  `lib/montree/tracy/` (folder still named `tracy/`; the product is "Astra"),
  incl. `tool-executor.ts` (`internalGet` uses `http://127.0.0.1:${PORT}` — never
  the public origin). Existing tools include `get_child_photos` (school-scoped via
  `verifyChildBelongsToSchool`). Lives on `/montree/admin`.
- **Mira = the sales-agent coach AI.** `app/api/montree/agent/mira/route.ts` (562)
  + `app/montree/agent/mira/page.tsx` (619): Sonnet (moved Opus→Sonnet, 5× cheaper),
  `consult_knowledge` tool over `product.md` + `playbook.md`, coaches blank-slate
  agents zero→first-paid-school. Same tool-loop + prompt-caching pattern as Astra.
- **Parent-meeting pipeline (Ultimate Astra Phase B, Session 135) — the co-pilot
  foundation already exists, just POST-HOC not yet real-time:**
  - `…/parent-meetings/[meetingId]/transcribe-chunk/route.ts` — receives audio
    **chunks**, runs **Whisper** (`lib/montree/parent-meeting/transcribe.ts`:
    `recordChunk`, `finalizeAndDrain`, `transcribeAudioBlob`), **never writes audio
    to disk** (in-memory, dropped; `audio_destroyed_at` audit), encrypts transcript
    (AES-GCM `gcm:` prefix, `messaging-crypto`), **consent-gated** on first chunk.
    Whisper hard cap 25MB/chunk.
  - `…/analyse/route.ts` — decrypts transcript, loads parent profile, Sonnet
    analysis via `PARENT_MEETING_ANALYSIS_TOOL` (`parent-meeting/analysis-prompt.ts`),
    persists to `montree_parent_meeting_analyses` (~$0.05/analysis).
  - `…/proposals/route.ts` — profile-update proposals from the analysis.
- **Memory layer already exists.** Parent profiles (`parent-profile/loader.ts`) +
  the **Tracy corpus (pgvector)** self-improving knowledge base + consent flags.
  This IS the substrate for per-child / per-principal memory.
- **Curriculum graph already exists.** `LESSON_MAP` (1–128, CONSTANT),
  `phonics-data.ts` (`lessonNums` + ids), resolvers in `english-sequence/
  lesson-materials.ts`, the 8 `phonics-fast` generators (`?lesson=N`), and the
  per-lesson launcher `app/montree/library/lesson/[lesson]/page.tsx`.
- **Infra facts that constrain this build:** Railway + Supabase **co-located in
  Singapore** (region proximity was the #1 latency fix — keep it). Data layer is
  **PostgREST over HTTPS**, not direct `pg`. Capacitor wraps iOS/Android
  (`capacitor.config.ts`, `android/`, `ios/`). Encryption requires
  `MONTREE_ENCRYPTION_KEY`. Every Sonnet route must tier-gate via
  `resolveReportModel()`. Pushing = Desktop Commander → Railway auto-deploys main.

**Translation:** the brain (Astra/Mira tool-loops), the ears (Whisper chunking),
the memory (profiles + pgvector corpus), the consent/encryption rails, and the
curriculum graph are all SHIPPED. The four genuinely new things are: (a) a
real-time **voice transport** layer, (b) turning the post-hoc meeting analysis
into a **live** co-pilot, (c) a **child oral-reading** engine, (d) the
**multimodal** presentation layer.

---

## Feasibility verdict (the honest read)

| Ambition | Verdict | Note |
|---|---|---|
| Hands-free multilingual voice Astra | 🟢 Ready | Agora Conversational AI Engine: multilingual, `session.tools` function-calling, sub-second. Wraps the EXISTING principal-agent tool-loop. |
| Astra takes actions from voice (appointment/message) | 🟢 Ready | Reuse/extend existing tools; confirm-before-act on anything touching a real person. |
| Astra outbound calls ("call so-and-so") | 🟡 Gated | Agora has outbound-call API; do LAST, with consent + allowlist. |
| Live co-pilot (pre-drafts next response, no delay) | 🟢 Ready | Extend `transcribe-chunk` to stream + add a fast (Haiku) "next-best-response" pass; **parallel listener, never in the speak path.** |
| Home learning, route child to correct lesson | 🟢 Ready | `current_lesson` + lesson-materials resolvers already do the routing. |
| **Children's oral-reading miscue detection** | 🟠 **The hard part** | Whisper transcribes but is NOT a miscue detector for kids' voices. **Prove with a spike before building around it.** This is why the earlier home attempt "wasn't good enough." |
| Memory (#5) | 🟢 Ready | Extend parent-profile + pgvector corpus to a per-child learner model. |
| Multimodal wow (#7) | 🟢 Ready | Voice + synced visuals (word highlight, miscue animation). |

---

## Roadmap — ordered to de-risk the scary part first, bank a fast win second

### Phase 0 — Audit + the oral-reading spike (do FIRST; ~1–2 wks)
- Confirm what appointment/message tools already exist in `tool-executor.ts`
  (the voice layer needs these as the "hands").
- **THE CRITICAL SPIKE:** ~20 real children reading real decodable texts.
  Measure **miscue detection** (substitution / omission / self-correction
  against the known target word), not raw transcription WER. Test in this order:
  (1) a specialist reading-ASR vendor; (2) kids-tuned ASR + our own alignment
  layer against the lesson's target text; (3) build-from-scratch only if both
  fail. **This test alone green/red-lights Phase 3.**
- Decide Agora vs. (OpenAI Realtime / Gemini Live) for the voice brain; get keys.

### Phase 1 — Hands-free Astra voice (the fast, low-risk, high-wow win)
- Add an Agora voice session that streams principal speech → STT → the EXISTING
  `principal-agent` tool-loop → TTS reply. Multilingual in/out.
- Wire read-only tools first (lookup child lesson/progress, schedule), then
  write tools behind a **confirm step** (create appointment, send message).
- Feature-flag via `isFeatureEnabled` (dormant in prod until ready), tier-gate
  the model, keep server-to-self calls on `127.0.0.1:${PORT}`.

### Phase 2 — Live meeting co-pilot (memory-powered = the real "wow", #5)
- Evolve the meeting flow from record→analyse-after to **live**: stream
  `transcribe-chunk` partials and, per partial, run a FAST (Haiku) next-best-
  response pass that posts suggestions to a side panel on the meeting UI
  (`app/montree/admin/parents/[parentId]/meetings/[meetingId]/page.tsx`).
- Pull the parent profile + pgvector corpus so suggestions are personal.
- Keep it a **parallel listener** — never blocks the live conversation. Keep the
  existing post-hoc `analyse` + `proposals` as the durable record.
- Consent gate is already there — reuse it; recording a live conversation needs
  everyone's consent.

### Phase 3 — Home learning + oral reading (GATED on the Phase 0 spike)
- New learner surface: student logs in → read `current_lesson` → route to the
  right reader/exercises via `lesson-materials.ts` → Mira(-style tutor) listens
  to oral reading → Socratic micro-intervention on the exact sound that broke
  (the Amira pattern). Reuse the `phonics-fast` generators as content.

### Phase 4 — Multimodal "wow" (#7)
- Sync visuals to Mira's voice: word/letter highlight as the child reads, sound
  animation + instant reward on miscue. Voice+visual+text = the retention lift
  and the emotional hook. For Astra: a calm live-transcript + suggestion panel.

### Phase 5 — Outbound calling (LAST)
- Astra dials on the principal's behalf via Agora — consent, confirm, allowlist.

---

## Guardrails (non-negotiable — children + real people)
- **Confirm before any action on a real person** (appointment/message/call).
  Never autonomous on irreversible/social actions.
- **Consent + privacy:** audio never persisted (already true for meetings —
  keep it true for oral reading); transcripts encrypted; child data stays
  in-system and school-scoped (`verifyChildBelongsToSchool`, `auth.schoolId`).
- **Co-pilot suggests, human decides** — it whispers, never auto-sends/speaks.
- **Tutor stays in lesson scope** — guide to self-correct, don't hand answers.
- **Eval gate** before every prompt/model change; keep per-round diagnostic
  logging (`sonnet_round=`) — it's what cracked the blank-bubble bug.
- **Latency:** co-pilot off the speak path; tutor feedback < ~1s.

---

## What's needed to START coding (blockers for Tredoux)
1. **Agora account + API keys** (and decision: Agora-native brain vs. OpenAI
   Realtime / Gemini Live behind Agora transport).
2. **Reading-ASR decision** — willingness to trial a specialist vendor for the
   Phase 0 spike (the cheapest way to de-risk the home product).
3. Go-ahead on which phase to build first. Recommended: **Phase 0 spike in
   parallel with Phase 1 (hands-free Astra)** — the spike de-risks the home
   product while Phase 1 banks a visible win on already-green tech.

## First concrete code increment (proposed, no new vendor needed)
Phase 2's live co-pilot is the best first *code* step because it needs **no new
external vendor** — it reuses Whisper + Sonnet/Haiku + the meeting UI that
already exist. Scaffold it feature-flagged (`isFeatureEnabled('live_copilot')`)
so it's dormant in prod, then iterate. Everything else waits on Agora keys / the
reading-ASR decision.
