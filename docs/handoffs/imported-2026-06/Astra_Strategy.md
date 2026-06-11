# Making Astra Smarter, Faster, More Autonomous, and Cheaper

*A strategy and roadmap for Montree's in-app AI assistant*
*Drafted 30 May 2026*

---

## 0. What this is — and a caveat

This plan targets all four goals you named: **smarter responses, lower latency, better task completion, and lower cost.** Those goals trade against each other, so the document treats them as one system with shared levers, not four separate wishlists.

One honesty note up front: when I wrote this, the Montree project folder was empty on my side and I couldn't read Astra's actual code, so the diagnosis below is grounded in what your memory records about the stack (Next.js on Railway, Supabase backend, the phonics/English curriculum and lesson→materials loop, the story vault) plus the standard failure modes of in-app assistants. **Step 0 of the roadmap is therefore a real code audit of Astra** — once the repo is reachable I can replace the assumptions here with measured facts. Don't act on the specifics until that audit confirms them.

---

## 1. The core principle: you can't improve what you don't measure

Every "make the AI better" effort that skips measurement turns into vibes-based prompt-fiddling that regresses as often as it improves. Before changing anything, Astra needs an **eval harness and per-request telemetry**. This single investment is what makes all the other levers safe to pull.

Minimum instrumentation per Astra request:

- **Latency** broken into: time-to-first-token, total time, and time spent in each tool call / retrieval / DB query.
- **Cost**: input tokens, output tokens, cached tokens, model used.
- **Outcome**: did the user accept the answer, retry, rephrase, or abandon? (Thumbs, or implicit signals like "asked the same thing again.")
- **Trace**: the full prompt, retrieved context, tool calls, and final output — logged (with PII handling) so you can replay failures.

Then build a **golden set** of 50–150 real Astra questions with known-good answers (pull them from logs). Every prompt or model change runs against this set before shipping. This is the difference between "I think it's better" and "accuracy went 71% → 84%, p95 latency dropped 2.1s, cost fell 38%."

---

## 2. The four levers, mapped to concrete moves

### A. Smarter (effectiveness)

The biggest effectiveness wins for an education assistant almost never come from a bigger model — they come from **grounding** and **context engineering**.

1. **Retrieval-grounded answers (RAG).** If Astra answers questions about the curriculum, a child's progress, lessons, or materials, it should answer *from* Montree's own data, not from the model's general knowledge. You already have the perfect substrate: the phonics word groups, the 1–128 lesson map, the lesson→materials resolvers, and child progress in Supabase. Wire these in as retrieval so Astra cites the actual lesson a child is on and the actual materials that exist (the 72/128 that resolve to groups). This kills the #1 effectiveness killer — confident, wrong, ungrounded answers.

2. **Context engineering over context stuffing.** Don't dump the whole curriculum into every prompt. Retrieve the *relevant* lesson/group/child record and pass only that. Less, more-relevant context is both smarter (less distraction) and cheaper (fewer tokens).

3. **Structured tools instead of free-text reasoning.** Where Astra needs a fact — "what lesson is this child on", "what materials exist for lesson N", "what's in the story vault" — give it a *tool* that queries Supabase directly, rather than hoping the model recalls it. Tools turn guesses into lookups. (Your existing resolvers — `getGroupsForLesson`, `lessonCoverage`, etc. — are tool definitions waiting to happen.)

4. **A tight, role-specific system prompt.** One assistant trying to be a parent helper, a teacher's aide, and an admin tool will be mediocre at all three. Either split Astra into modes with distinct prompts, or give it a clear primary role and clear boundaries. Specify tone (warm, age-appropriate for a children's product), what it must never do, and how to say "I don't know / let me get a human."

### B. Faster (latency)

1. **Stream tokens to the UI.** If Astra doesn't already stream, this is the single highest-perceived-speed change. Time-to-first-token matters more to users than total time.

2. **Model tiering / routing.** Don't send every request to your largest model. Route by difficulty (see the table in §3). A classifier or simple heuristic sends easy/lookup questions to a fast small model and reserves the big model for genuinely hard reasoning.

3. **Prompt caching.** Anthropic's prompt caching lets you cache the stable prefix of your prompt — system instructions, tool definitions, curriculum context that repeats across requests. Cached tokens are read far faster and cheaper than re-processing them every call. For an assistant with a large fixed instruction/curriculum block, this is a big, low-effort win on *both* latency and cost.

4. **Parallelize and prefetch.** Run independent tool calls concurrently rather than serially. Prefetch likely context (e.g. the current child's lesson record) while the model is still reading the question.

5. **Cache answers to repeated questions.** Education questions cluster ("how do I print materials for lesson 12?"). A semantic cache returns instant, free answers to near-duplicate questions.

### C. Cheaper (cost efficiency)

Cost is mostly a function of *tokens × model price*, so the cost levers are largely the same moves as speed:

1. **Right-size the model per request** (tiering — §3). The majority of real traffic is simple and does not need a frontier model.
2. **Prompt caching** for the repeated prefix — you pay full price once, then a fraction on every subsequent hit.
3. **Trim context** — retrieve the relevant slice instead of stuffing everything (§A.2). This is the quiet cost sink in most assistants.
4. **Cap output length** with clear instructions and `max_tokens` — verbose answers cost money and read worse in a chat UI.
5. **Batch the non-interactive work.** Anything Astra does in the background (e.g. generating lesson summaries, pre-computing material descriptions) can go through the Batch API at roughly half the cost, since it isn't latency-sensitive.

### D. More autonomous (task completion)

This is the leap from "chatbot that answers" to "assistant that does." The pattern is an **agentic loop with verification**:

1. **Give Astra real tools, not just knowledge.** Querying progress, generating/launching materials for a lesson, surfacing a story from the vault, drafting a parent message. The lesson launcher and material generators you've built are exactly the kind of actions to expose.

2. **Plan → act → check → finish.** For multi-step requests, have Astra state a short plan, execute tools, and *verify* the result before declaring done (e.g. confirm the materials it claims to have prepared actually resolve for that lesson). A verification step is the cheapest reliability upgrade there is.

3. **Guardrails sized to a children's product.** Autonomy raises the stakes. Astra should have a hard allowlist of actions, never touch the story vault's private files or destructive operations without explicit confirmation, and escalate to a human on anything safety-adjacent. Bound the agent loop (max steps) so it can't spin.

4. **Graceful failure.** When a tool fails or Astra is unsure, it should say so and hand off — not fabricate. For parents and teachers, a reliable "I couldn't do that, here's why" beats a confident wrong action.

---

## 3. A model-routing blueprint

The core efficiency move. Classify each request, then route:

| Request type | Examples | Model tier | Why |
|---|---|---|---|
| Lookup / factual | "What lesson is Emma on?", "What materials exist for lesson 12?" | Small/fast (Haiku-class) + a tool call | Answer is in the DB; the model just formats it. Fast and cheap. |
| Routine help / explanation | "How do I print this?", "What does this sound teach?" | Small/fast, grounded by retrieval | Bounded scope, retrieval does the heavy lifting. |
| Multi-step / reasoning | "Build a week of materials for these three children and explain the sequence" | Mid (Sonnet-class) in an agent loop | Needs planning + several tools. |
| Hard / ambiguous / sensitive | Novel curriculum reasoning, edge cases, anything safety-adjacent | Large (Opus-class) | Worth the cost; rare in volume. |

The routing decision itself can be a cheap small-model classification or a heuristic on keywords/intent. Even a crude version captures most of the savings, because lookup and routine traffic dominate volume while hard requests dominate cost — so moving the common cases down a tier cuts the bill sharply without hurting quality on the cases that matter.

---

## 4. Proposed architecture (target state)

```
User (parent / teacher / admin)
        │
        ▼
   Astra gateway  ──►  Router (intent + difficulty classify)
        │                       │
        │              ┌────────┴────────┐
        │           fast tier         reasoning tier (agent loop)
        │              │                   │
        ▼              ▼                   ▼
   Prompt cache   Retrieval over Montree data        Tools
   (system +      (phonics groups, lesson map,   ┌── query progress (Supabase)
    tool defs +    child progress, materials,    ├── resolve/launch materials
    curriculum)    story vault metadata)         ├── search story vault
        │                                        └── draft message / summary
        ▼
   Eval harness + telemetry  (latency · cost · outcome · full trace)
        │
        ▼
   Golden-set regression gate before every prompt/model change
```

Notes that fit your stack: retrieval and tools read from the same Supabase you already run; the story vault stays behind its existing admin/vault gate and service-key boundary (Astra gets *metadata* and signed access, never the raw private files or the service key); and on Railway, remember the internal self-fetch loopback rule for any server-to-self calls Astra makes.

---

## 5. Roadmap (phased, in priority order)

**Phase 0 — Audit & instrument (do first, ~days)**
- Read Astra's current code: model(s) used, prompt structure, whether it streams, whether it has tools/retrieval, where latency and tokens go.
- Add per-request telemetry (latency split, token/cost, outcome, trace).
- Build the golden set (50–150 real questions with good answers).
- *Outcome: a measured baseline. Nothing below ships without comparing against it.*

**Phase 1 — Quick wins (low effort, high return)**
- Turn on streaming if it isn't already.
- Add prompt caching for the stable system/tool/curriculum prefix.
- Tighten the system prompt (role, tone, boundaries, "I don't know" behavior).
- Cap output length.
- *Expected: noticeably faster perceived response, meaningful cost drop, fewer rambly answers — at low risk.*

**Phase 2 — Grounding & routing (the effectiveness + cost core)**
- Wire retrieval over the curriculum + child progress so answers are grounded and cited.
- Expose the first 3–4 read-only tools (progress lookup, material resolver, vault metadata search).
- Add model routing (fast tier vs reasoning tier).
- *Expected: the big jump in answer accuracy and the big cut in cost per request.*

**Phase 3 — Autonomy (the task-completion leap)**
- Add the agent loop with plan→act→verify and bounded steps.
- Add action tools (launch materials, draft messages) behind guardrails + confirmation.
- Add a semantic answer cache for repeated questions.
- Move background generation to the Batch API.
- *Expected: Astra completes real multi-step jobs reliably, at low marginal cost.*

**Phase 4 — Continuous improvement**
- Mine logs for failure clusters; expand the golden set.
- A/B prompt and routing changes against the eval gate.
- Periodically re-evaluate model choices as new model versions ship.

---

## 6. Risks and guardrails (non-negotiable for a children's product)

- **Child safety first.** Astra serves a product used by/around children. Age-appropriate tone, refusal on anything unsafe, and human escalation must be built in, not bolted on. Treat any safety-adjacent request as a routing trigger to the most careful path.
- **Privacy.** Child progress data and the story vault are sensitive. Astra reads only what it needs, never exposes the `vault-secure` private files or the service key, and logs/traces must scrub PII.
- **No autonomous destructive or money/data-moving actions** without explicit human confirmation.
- **Grounding over fluency.** A wrong-but-confident answer to a parent or teacher is worse than "let me check / I don't know."
- **Guard against regression.** The eval gate exists precisely so a "smarter" prompt tweak doesn't quietly break ten other cases.

---

## 7. The one-paragraph version

Astra gets better not by swapping in a bigger brain, but by **grounding it in Montree's own curriculum and child data, giving it tools to look things up and take actions, routing each request to the cheapest model that can handle it, caching the parts that repeat, and measuring everything against a golden set so changes are provably improvements.** Do the audit and instrumentation first; then quick wins (streaming, prompt caching, tighter prompt); then grounding + routing for the accuracy-and-cost core; then the agent loop for real task completion — all behind guardrails appropriate to a children's product.
