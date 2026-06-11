# Mira & Astra — A Real Build Plan

*From conversation with Tredoux, 30 May 2026*
*Vision: hands-free multilingual Astra that listens, speaks, and acts for the principal; a live conversation co-pilot; and a home learning program where students read aloud and are guided through the real classroom curriculum.*

---

## 0. The one honest caveat

I still haven't seen Mira's and Astra's current code (the folder syncs empty to me). So this plan is built from the vision you described + verified 2026 tech, not from your existing implementation. Two consequences: (a) where I say "build X," some of it may already exist — the first real task is an audit; (b) I've assigned clean **roles** to the two names and you should remap them to whatever Mira and Astra already are.

Proposed role split (rename freely):
- **Astra = the principal's agent.** Real-time multilingual voice; hands-free; takes actions (appointments, messages, calls); and runs the live conversation co-pilot.
- **Mira = the learner's tutor.** Lives in the home learning program; listens to a child read aloud; guides them through the correct lesson for their classroom level.

They share one spine: memory, curriculum grounding, evals, and child-safety guardrails.

---

## 1. Feasibility verdict — answering "is the tech actually there?"

You said you're hesitant because you're unsure of the tech. Here's the honest, grounded read on each ambition:

| Ambition | Verdict | Why |
|---|---|---|
| **Astra as hands-free multilingual voice agent** (principal speaks any language, Astra speaks back) | 🟢 **Ready now** | This is exactly what Agora's Conversational AI Engine does — voice agents on web/iOS/Android, multilingual with automatic code-switching, sub-second response. It's the product you referenced. |
| **Astra takes actions** (set appointment, send message) **from voice** | 🟢 **Ready now** | Agora lets you register functions on `session.tools` so the agent can hit your APIs and trigger workflows mid-conversation. Appointments/messages are low-risk with a confirm step. |
| **Astra places outbound calls** ("call so-and-so") | 🟡 **Ready, but gated** | Agora added outbound calling (agent dials a number via POST API and talks). Technically there. But calling real people on someone's behalf needs consent + guardrails — treat as a later, carefully-scoped phase. |
| **Live conversation co-pilot** (listens, pre-drafts the next thing to say, no delay) | 🟢 **Ready now** | This is the proven "agent assist / next-best-action" pattern from contact centres (Talkdesk, Microsoft Copilot Studio real-time voice, etc.), running sub-500ms as a *parallel listener* — so it never delays the live conversation. |
| **Home learning: curriculum-aligned reading + exercises, agent leads to the right lesson** | 🟢 **Ready now** | Your lesson map (1–128) + materials resolvers already encode "which lesson, which materials." Wiring a tutor agent to a child's `current_lesson` is straightforward. |
| **Oral-reading speech recognition for young children** | 🟠 **The hard part — buildable, but this is where the last attempt died** | Detecting reading *miscues* in children's voices is a specialised problem; generic ASR underperforms here. This is real (Amira does it at 0.40 effect size) but it's the piece to **prove first** and likely the piece to **license rather than build** if a spike disappoints. |
| **Persistent memory** (your "Number 5") | 🟢 **Ready now** | A per-child learner model + per-principal ops memory on the Supabase you already run. Mature pattern in 2026. |
| **Multimodal "wow"** (your "Number 7") | 🟢 **Ready now** | Voice + visuals together; dual-coded materials lift retention 55–75%. Aligns with Montessori multisensory philosophy. |

**Bottom line: 7 of 8 are green. The one orange item is the highest-leverage one — children's oral-reading — so we test it before betting on it.**

---

## 2. Architecture — the shared spine + two agents

```
                         ┌──────────────────────────────────────┐
                         │            SHARED SPINE                │
                         │  • Learner model (per child)           │
                         │  • Ops memory (per principal/school)   │
                         │  • Curriculum graph (lesson map 1–128, │
                         │    phonics groups, materials resolvers)│
                         │  • Eval harness + traces               │
                         │  • Child-safety + consent guardrails   │
                         └───────────────┬──────────────────────┘
                                         │ (Supabase + your Next.js/Railway)
              ┌──────────────────────────┴───────────────────────────┐
              ▼                                                        ▼
   ┌─────────────────────────────┐                    ┌───────────────────────────────┐
   │  ASTRA — principal's agent  │                    │   MIRA — learner's tutor       │
   │                             │                    │                                │
   │  Real-time voice (Agora CAI)│                    │  Oral-reading engine (listens  │
   │  ├ multilingual in/out      │                    │   to child read aloud, detects │
   │  ├ tool calls: appointments,│                    │   miscues at phoneme level)    │
   │  │  messages, lookups       │                    │  ├ routes child to correct     │
   │  └ outbound calls (gated)   │                    │  │  lesson for their class level│
   │                             │                    │  ├ Socratic micro-interventions│
   │  Co-pilot (parallel listener):                   │  └ multimodal exercises + books│
   │  whispers next-best response │                    │                                │
   │  in a side panel, no delay  │                    │                                │
   └─────────────────────────────┘                    └───────────────────────────────┘
```

Two design rules that make this work:

1. **The co-pilot is a parallel listener, never in the speaking path.** It transcribes and reasons on a separate stream and posts suggestions to a side panel. That's why "the AI already prepared the next response" with *no wait* — it's been working the whole time in the background, not on-demand.

2. **Voice agent = ears+mouth (Agora) + brain (a realtime LLM) + hands (your tool functions).** Agora handles transport, turn-taking, multilingual TTS/ASR; the LLM (OpenAI Realtime or Gemini Live) does reasoning and decides when to call a tool; your functions do the actual Montree work (create appointment, fetch a child's lesson, send a message).

---

## 3. The tech stack (recommended choices)

- **Voice layer:** Agora Conversational AI Engine — you already named it, it does multilingual + function calling + outbound calling, and it runs on web + mobile.
- **Reasoning brain:** a realtime speech-to-speech LLM behind Agora (OpenAI Realtime for best tool-calling/instruction-following, or Gemini Live for ~32× cheaper audio at high volume — pick per cost/quality once tested).
- **Oral-reading / miscue detection:** evaluate in this order — (1) a specialist reading-ASR vendor/API; (2) a kids-tuned ASR + your own miscue-alignment layer against the known target text; (3) only build from scratch if both fail. **Do not assume a generic transcription API is enough — that's the trap from last time.**
- **Memory:** Supabase tables for the learner model and ops memory; retrieve the relevant slice per turn (don't stuff everything).
- **App:** your existing Next.js on Railway; reuse the lesson map, phonics groups, and materials resolvers as the curriculum graph and as Astra's/Mira's tools.
- **Guardrails/evals:** trace every agent decision; golden-set regression gate; explicit confirm-before-act on anything that touches a real person (calls, messages, appointments).

---

## 4. Roadmap — ordered to de-risk the scary part first and bank early wins

**Phase 0 — Audit & spike (≈1–2 weeks). Do this before committing.**
- Audit what Mira and Astra actually are today (models, prompts, tools, whether either streams/has voice).
- **The critical spike:** test children's oral-reading recognition on ~20 real kids reading real decodable texts. Measure miscue-detection accuracy (substitutions, omissions, self-corrections), not just transcription. *This single test decides whether the home-learning product is a green light, needs a licensed engine, or needs rethinking.* It's cheap and it's the thing that sank the last attempt.

**Phase 1 — Hands-free Astra for the principal (the fast, high-wow win).**
- Stand up Agora voice agent: principal speaks (any language), Astra answers (any language).
- Wire 2–3 read-only tools first (look up a child's lesson/progress, school schedule), then 1–2 write tools behind a confirm step (create appointment, send a message).
- *Why first: it's green-light tech, visibly impressive, and proves the voice+tools+memory loop with low risk before the hard ASR work.*

**Phase 2 — The live co-pilot ("Number 5"-powered, the real "wow").**
- Add the parallel-listener stream: transcribe the live conversation, and have Astra continuously pre-draft the next-best response/advice into a side panel.
- This is where **persistent memory** earns its keep — the co-pilot's suggestions get sharper because it remembers this parent, this child, past conversations. Consent + privacy handling is mandatory here (see §5).

**Phase 3 — Mira's home learning program (gated on the Phase-0 spike result).**
- Student logs in; Mira reads their classroom `current_lesson`, routes them to the right reading/exercises, listens as they read aloud, and runs Socratic micro-interventions on the exact sound that broke down (the Amira pattern).
- Reuse the lesson map + materials generators as the content engine.

**Phase 4 — Make it "wow": the multimodal layer ("Number 7").**
- Pair Mira's voice with synchronized visuals: the word/letter highlights as the child reads, sound animations on miscue, instant visual reward. Voice + visual + text = the 55–75% retention lift and the emotional "wow."
- For Astra: a clean live-transcript + suggestion panel that feels like a calm co-pilot, not a wall of text.

**Phase 5 — Outbound calling (only when everything else is solid).**
- Astra places calls on the principal's behalf — strictly with consent, confirmation, and a tight allowlist. High value, highest risk; do it last.

---

## 5. Risks & guardrails (non-negotiable — children + real people involved)

- **Children's privacy & consent.** Audio of kids reading, and recordings of parent conversations, are sensitive. Get explicit consent, minimise retention, scrub/segregate PII, and never feed child data outside the system. The co-pilot recording live conversations especially needs clear consent from everyone in the room.
- **Confirm before acting on real people.** Appointments, messages, and *especially* outbound calls must show the principal what Astra is about to do and wait for a yes. Never autonomous on irreversible/social actions.
- **Grounding over fluency for the tutor.** Mira must stay inside the lesson scope and guide the child to self-correct — not hand over answers, not improvise curriculum.
- **The co-pilot suggests, the human decides.** It whispers; it never speaks for the principal or auto-sends.
- **Eval gate.** Every prompt/model change runs against a golden set so "smarter" never silently breaks something — vital in a kids' product.
- **Latency discipline.** Keep the co-pilot off the live speaking path; keep Mira's feedback under ~1s so a child doesn't lose the thread.

---

## 6. What I recommend you do next (this week)

Run **Phase 0**: let me audit Mira/Astra (sync the repo or paste the prompts/handlers), and run the children's oral-reading spike. That one test tells us whether the home-learning product is green, and the audit tells me exactly how much of Astra already exists. From there I can turn any phase above into a build-ready spec with concrete files, APIs, and tasks.

The sequence is deliberate: **prove the hard thing cheaply (Phase 0) → bank a visible win that proves the voice+tools loop (Phase 1, Astra) → add the memory-powered co-pilot wow (Phase 2) → then the learning program (Phase 3) → then make it beautiful (Phase 4) → then calling (Phase 5).**
